import xmlrpc.client
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

class SupervisorService:
    """Service class to interact with supervisord and get process information."""

    def __init__(self, host=None, port=None, username=None, password=None):
        if not host and not username:
            host = os.getenv('SUPERVISOR_HOST', 'localhost')
            port = int(os.getenv('SUPERVISOR_PORT', 9001))
            username = os.getenv('SUPERVISOR_USERNAME')
            password = os.getenv('SUPERVISOR_PASSWORD')
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        
        # Construct server URL with authentication if credentials provided
        if self.username and self.password:
            self.server_url = f"http://{self.username}:{self.password}@{self.host}:{self.port}/RPC2"
        else:
            self.server_url = f"http://{self.host}:{self.port}/RPC2"
        
        self.server = None
        self._connect()

    def _connect(self):
        """Connect to supervisord XML-RPC server."""
        try:
            self.server = xmlrpc.client.ServerProxy(self.server_url)
            # Test connection
            self.server.supervisor.getVersion()
        except Exception as e:
            self.server = None
            print(f"Failed to connect to supervisord: {e}")

    def is_connected(self):
        """Check if connected to supervisord."""
        return self.server is not None

    def get_all_processes(self):
        """Get information about all processes managed by supervisord."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            processes = self.server.supervisor.getAllProcessInfo()
            process_info = []
            for proc in processes:
                process_info.append({
                    "name": proc['name'],
                    "group": proc['group'],
                    "pid": proc['pid'],
                    "state": proc['statename'],
                    "state_code": proc['state'],
                    "start": proc['start'] if proc['start'] else None,
                    "stop": proc['stop'] if proc['stop'] else None,
                    "now": proc['now'] if proc['now'] else None,
                    "exitstatus": proc['exitstatus'],
                    "spawnerr": proc['spawnerr'],
                    "description": proc['description']
                })
            return process_info
        except Exception as e:
            return {"error": f"Failed to get process info: {str(e)}"}

    def get_process_info(self, process_name):
        """Get information about a specific process."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            proc = self.server.supervisor.getProcessInfo(process_name)
            return {
                "name": proc['name'],
                "group": proc['group'],
                "pid": proc['pid'],
                "state": proc['statename'],
                "state_code": proc['state'],
                "start": proc['start'] if proc['start'] else None,
                "stop": proc['stop'] if proc['stop'] else None,
                "now": proc['now'] if proc['now'] else None,
                "exitstatus": proc['exitstatus'],
                "spawnerr": proc['spawnerr'],
                "description": proc['description']
            }
        except Exception as e:
            return {"error": f"Failed to get process info for {process_name}: {str(e)}"}

    def start_process(self, process_name):
        """Start a process."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            result = self.server.supervisor.startProcess(process_name)
            return {"success": True, "message": f"Process {process_name} started"}
        except Exception as e:
            return {"error": f"Failed to start process {process_name}: {str(e)}"}

    def stop_process(self, process_name):
        """Stop a process."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            result = self.server.supervisor.stopProcess(process_name)
            return {"success": True, "message": f"Process {process_name} stopped"}
        except Exception as e:
            return {"error": f"Failed to stop process {process_name}: {str(e)}"}

    def restart_process(self, process_name):
        """Restart a process."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            result = self.server.supervisor.stopProcess(process_name)
            result = self.server.supervisor.startProcess(process_name)
            return {"success": True, "message": f"Process {process_name} restarted"}
        except Exception as e:
            return {"error": f"Failed to restart process {process_name}: {str(e)}"}

    def get_supervisor_state(self):
        """Get supervisord state information."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            state = self.server.supervisor.getState()
            return {
                "state": state['statename'],
                "state_code": state['statecode'],
                "pid": self.server.supervisor.getPID()
            }
        except Exception as e:
            return {"error": f"Failed to get supervisor state: {str(e)}"}

    def get_process_stdout_log(self, process_name, offset=0, length=1024):
        """Get stdout log for a process (from tail by default)."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            result = self.server.supervisor.tailProcessStdoutLog(process_name, offset, length)
            return result[0]  # The log content
        except Exception as e:
            return {"error": f"Failed to get stdout log for {process_name}: {str(e)}"}

    def get_process_stderr_log(self, process_name, offset=0, length=1024):
        """Get stderr log for a process (from tail by default)."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            result = self.server.supervisor.tailProcessStderrLog(process_name, offset, length)
            return result[0]  # The log content
        except Exception as e:
            return {"error": f"Failed to get stderr log for {process_name}: {str(e)}"}

    def get_supervisor_info(self):
        """Get comprehensive supervisor information including all processes."""
        if not self.is_connected():
            return {"error": "Not connected to supervisord"}

        try:
            return {
                "supervisor_state": self.get_supervisor_state(),
                "processes": self.get_all_processes(),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}


if __name__ == "__main__":
    service = SupervisorService(
        host=os.getenv('SUPERVISOR_HOST'),
        port=int(os.getenv('SUPERVISOR_PORT', 9001)),
        username=os.getenv('SUPERVISOR_USERNAME'),
        password=os.getenv('SUPERVISOR_PASSWORD')
    )
    if service.is_connected():
        info = service.get_supervisor_info()
        print(info)
    else:
        print("Could not connect to supervisord")