# Server socket
bind = "0.0.0.0:5001"
backlog = 2048

# Worker processes
# workers = multiprocessing.cpu_count() * 2 + 1
workers = 3
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "garmin-csv-filter"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

def on_starting(server):
    server.log.info("Starting Garmin CSV Filter")

def on_reload(server):
    server.log.info("Reloading Garmin CSV Filter")

def when_ready(server):
    server.log.info("Server is ready. Spawning workers")

def on_exit(server):
    server.log.info("Shutting down Garmin CSV Filter")

