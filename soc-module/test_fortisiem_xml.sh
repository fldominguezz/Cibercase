#!/bin/bash
# Script para enviar un mensaje de prueba Syslog UDP con XML de FortiSIEM al listener del SOC module.

TARGET_IP="127.0.0.1" # Enviamos a localhost, ya que el script se ejecuta en el mismo host que Docker
TARGET_PORT="514"
FORTISIEM_XML='<incident incidentId="1814704" organization="Super" repeatCount="1" ruleType="PH_RULE_HIGH_SEV_SEC_IPS_IN_PERMIT" severity="9" status="0">
    <name>High Severity Inbound Permitted IPS Exploit</name>
    <remediation/>
    <description>Detects a permitted high severity IPS security exploit from outside. This rule makes sense only from an IPS positioned inside the firewall. Since this attack went through the firewall, its consequence must be monitored.</description>
    <policyID/>
    <displayTime>Tue Nov 11 12:56:30 ART 2025</displayTime>
    <incidentCategory>Security/Execution</incidentCategory>
    <incidentSource>
        <entry attribute="srcIpAddr" name="Source IP">186.57.15.218</entry>
    </incidentSource>
    <incidentTarget>
        <entry attribute="destIpAddr" name="Destination IP">200.105.122.1</entry>
    </incidentTarget>
    <incidentDetails>
        <entry attribute="compEventType" name="Component Event Type">FortiGate-ips-anomaly-285212776</entry>
        <entry attribute="attackName" name="Attack Name">udp_scan</attackName>
        <entry attribute="ipsSignatureId" name="Signature Id">285212776</entry>
        <entry attribute="incidentCount" name="Triggered Event Count">2</incidentCount>
    </incidentDetails>
    <affectedBizSrvc/>
    <identityLocation/>
    <mitreTactic>null</mitreTactic>
    <mitreTechniqueId>null</mitreTechniqueId>
    <rawEvents>
    [NonIPSHighSev]
        &lt;185&gt;logver=704072731 timestamp=1762865754 devname="PFA-cluster_FG10E0" devid="FG10E0TB22903003" vd="root" date="2025-11-11" time="12:55:54" eventtime=1762876554620862412 tz="-0300" logid="0720018432" type="utm" subtype="anomaly" eventtype="anomaly" level="alert" severity="critical" srcip="186.57.15.218" srccountry="Argentina" dstip="200.105.122.1" dstcountry="Argentina" srcintf="port27" srcintfrole="undefined" sessionid=0 action="detected" proto=17 service="udp/49802" count=0 attack="udp_scan" srcport=18088 dstport=49802 attackid=285212776 policyid=3 policytype="DoS-policy" ref="http://www.fortinet.com/ids/VID285212776" msg="anomaly: udp_scan, 102 &gt; threshold 100" crscore=50 craction=4096 crlevel="critical"

        &lt;185&gt;logver=704072731 timestamp=1762865754 devname="PFA-cluster_FG10E0" devid="FG10E0TB22903003" vd="root" date="2025-11-11" time="12:55:54" eventtime=1762876554620859931 tz="-0300" logid="0720018432" type="utm" subtype="anomaly" eventtype="anomaly" level="alert" severity="critical" srcip="186.57.15.218" srccountry="Argentina" dstip="200.105.122.1" dstcountry="Argentina" srcintf="port27" srcintfrole="undefined" sessionid=0 action="detected" proto=17 service="udp/19839" count=311 attack="udp_scan" srcport=18088 dstport=19839 attackid=285212776 policyid=3 policytype="DoS-policy" ref="http://www.fortinet.com/ids/VID285212776" msg="anomaly: udp_scan, 101 &gt; threshold 100, repeats 311 times since last log" crscore=50 craction=4096 crlevel="critical"

  </rawEvents>
</incident>'

echo "Enviando mensaje Syslog XML de FortiSIEM a ${TARGET_IP}:${TARGET_PORT}..."
echo "${FORTISIEM_XML}" | nc -u -w0 ${TARGET_IP} ${TARGET_PORT}
echo "Mensaje XML enviado."