import psutil
import os
import time
from datetime import datetime
import docker

class PiStatusService:
    """Service class to get Raspberry Pi system status information."""

    @staticmethod
    def get_cpu_usage():
        """Get current CPU usage percentage."""
        try:
            return psutil.cpu_percent(interval=1)
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_memory_usage():
        """Get memory usage information."""
        try:
            mem = psutil.virtual_memory()
            return {
                "total": mem.total,
                "used": mem.used,
                "free": mem.free,
                "percent": mem.percent
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_disk_usage():
        """Get disk usage information for root filesystem."""
        try:
            disk = psutil.disk_usage('/')
            return {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_temperature():
        """Get CPU temperature."""
        try:
            # For Raspberry Pi, temperature is usually in /sys/class/thermal/thermal_zone0/temp
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = int(f.read().strip()) / 1000.0
            return temp
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_uptime():
        """Get system uptime in seconds."""
        try:
            with open('/proc/uptime', 'r') as f:
                uptime_seconds = float(f.readline().split()[0])
            return uptime_seconds
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_network_info():
        """Get network interface information."""
        try:
            net_info = {}
            for interface, stats in psutil.net_if_addrs().items():
                net_info[interface] = []
                for addr in stats:
                    if addr.family.name == 'AF_INET':
                        net_info[interface].append({
                            "address": addr.address,
                            "netmask": addr.netmask,
                            "broadcast": addr.broadcast
                        })
            return net_info
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_docker_containers():
        """Get Docker containers information."""
        try:
            # Check if Docker is available and accessible
            client = docker.from_env()
            # Test connection by getting Docker version
            client.version()
            containers = client.containers.list(all=True)
            container_info = []
            for container in containers:
                container_info.append({
                    "id": container.short_id,
                    "name": container.name,
                    "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                    "status": container.status,
                    "state": container.attrs['State']['Status'],
                    "ports": container.attrs.get('NetworkSettings', {}).get('Ports', {}),
                    "created": container.attrs['Created']
                })
            return container_info
        except docker.errors.DockerException as e:
            return {"error": f"Docker not accessible: {str(e)}"}
        except Exception as e:
            return {"error": f"Docker error: {str(e)}"}

    @staticmethod
    def get_system_info():
        """Get comprehensive system information."""
        try:
            return {
                "cpu_usage": PiStatusService.get_cpu_usage(),
                "memory": PiStatusService.get_memory_usage(),
                "disk": PiStatusService.get_disk_usage(),
                "temperature": PiStatusService.get_temperature(),
                "uptime": PiStatusService.get_uptime(),
                "network": PiStatusService.get_network_info(),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}


if __name__ == "__main__":
    status = PiStatusService.get_system_info()
    print(status)