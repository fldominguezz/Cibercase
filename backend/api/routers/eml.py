from fastapi import APIRouter, HTTPException, status, File, UploadFile
import email
from email.policy import default
import re

router = APIRouter()


# Helper function to extract URLs
def extract_urls(text):
    # Regex to find URLs
    url_pattern = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')
    return url_pattern.findall(text)


# Helper function to check for suspicious attachments
def check_suspicious_attachment(filename, content_type):
    suspicious_extensions = [
        ".exe",
        ".zip",
        ".js",
        ".vbs",
        ".scr",
        ".bat",
        ".cmd",
        ".ps1",
        ".dll",
        ".chm",
        ".hta",
    ]
    if any(filename.lower().endswith(ext) for ext in suspicious_extensions):
        return True
    # Add more sophisticated checks if needed, e.g., checking content_type for executables
    return False


# Helper function to check for phishing indicators
def check_phishing_indicators(subject, body, headers):
    indicators = []

    # Check for urgency/threat in subject or body
    urgency_keywords = [
        "urgente",
        "acción requerida",
        "su cuenta será suspendida",
        "verifique su cuenta",
        "caduca",
    ]
    if any(keyword in subject.lower() for keyword in urgency_keywords):
        indicators.append("Asunto o cuerpo con palabras clave de urgencia/amenaza.")
    if any(keyword in body.lower() for keyword in urgency_keywords):
        indicators.append("Asunto o cuerpo con palabras clave de urgencia/amenaza.")

    # Check for requests for credentials
    credential_keywords = [
        "contraseña",
        "usuario",
        "credenciales",
        "iniciar sesión",
        "verificar ahora",
    ]
    if any(keyword in body.lower() for keyword in credential_keywords):
        indicators.append("Solicitud de credenciales en el cuerpo del correo.")

    # Check for generic greetings
    generic_greetings = ["estimado usuario", "querido cliente"]
    if any(greeting in body.lower() for greeting in generic_greetings):
        indicators.append("Saludo genérico en el cuerpo del correo.")

    # Check for sender/recipient mismatch (simple check)
    from_header = headers.get("From", "").lower()
    return_path = headers.get("Return-Path", "").lower()
    if (
        from_header
        and return_path
        and from_header != return_path
        and "via" not in from_header
    ):
        indicators.append(
            f"Posible suplantación de identidad: 'From' ({from_header}) difiere de 'Return-Path' ({return_path})."
        )

    return indicators


def decode_payload(part):
    """Safely decode email payload."""
    payload = part.get_payload(decode=True)
    if not payload:
        return ""
    # Get charset, default to latin-1 if not found, as it's less likely to crash
    charset = part.get_content_charset("latin-1")
    try:
        # Decode using the detected charset, replace errors to avoid crashes
        return payload.decode(charset, errors="replace")
    except (UnicodeDecodeError, AttributeError, LookupError):
        # Fallback to latin-1 for maximum compatibility
        return payload.decode("latin-1", errors="replace")


@router.post("/scan")
async def scan_eml_file(eml_file: UploadFile = File(...)):
    if not eml_file.filename.endswith(".eml"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser de tipo EML.",
        )

    content = await eml_file.read()
    msg = email.message_from_bytes(content, policy=default)

    # Extraer información básica
    result = {
        "from": msg.get("From"),
        "to": msg.get("To"),
        "subject": msg.get("Subject"),
        "date": msg.get("Date"),
        "headers": dict(msg.items()),
        "body": "",
        "attachments": [],
    }

    # Extraer cuerpo del correo y adjuntos
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))

            if part.get_filename():  # Es un adjunto
                result["attachments"].append(
                    {
                        "filename": part.get_filename(),
                        "content_type": content_type,
                        "is_suspicious": check_suspicious_attachment(
                            part.get_filename(), content_type
                        ),
                    }
                )
            elif (
                "text/plain" in content_type and "attachment" not in content_disposition
            ):
                if not result["body"]:  # Prioritize first plain text part
                    result["body"] = decode_payload(part)
    else:
        result["body"] = decode_payload(msg)

    # Realizar análisis de seguridad
    malicious_links = []
    extracted_urls = extract_urls(result["body"])
    for url in extracted_urls:
        # Implement more robust URL checking here (e.g., against a blacklist, Safe Browsing API)
        # For now, a simple check for common suspicious patterns
        if (
            "login" in url.lower() and "example.com" not in url.lower()
        ):  # Placeholder for actual domain
            malicious_links.append(f"URL sospechosa (posible phishing): {url}")
        elif (
            "update" in url.lower() and "legit-domain.com" not in url.lower()
        ):  # Placeholder
            malicious_links.append(
                f"URL sospechosa (posible actualización falsa): {url}"
            )

    phishing_indicators = check_phishing_indicators(
        result["subject"], result["body"], result["headers"]
    )

    result["security_analysis"] = {
        "malicious_links": (
            malicious_links
            if malicious_links
            else "No se detectaron enlaces maliciosos obvios."
        ),
        "suspicious_attachments": [
            att for att in result["attachments"] if att["is_suspicious"]
        ],
        "phishing_indicators": (
            phishing_indicators
            if phishing_indicators
            else "No se detectaron indicadores de phishing obvios."
        ),
    }

    return result
