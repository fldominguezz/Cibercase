// cypress/e2e/login.cy.js
describe('Login and Dashboard Navigation', () => {
  it('should allow a user to log in and navigate to the dashboard', () => {
    // Visit the login page
    cy.visit('/login');

    // Enter credentials
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('admin123');

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify successful login and redirection to dashboard
    cy.url().should('include', '/dashboard');
    cy.contains('h1', 'Dashboard').should('be.visible'); // Assuming your dashboard has an H1 with "Dashboard"
  });
});