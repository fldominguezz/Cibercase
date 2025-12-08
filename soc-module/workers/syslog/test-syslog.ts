import { SyslogServer } from 'syslog-server';

try {
  const server = new SyslogServer();
  console.log('SyslogServer instantiated successfully.');
} catch (error) {
  console.error('Error instantiating SyslogServer:', error);
}