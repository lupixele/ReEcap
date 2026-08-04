import http.server
import socketserver
import urllib.request
import urllib.parse
import sys

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the path to get the target URL
        if self.path.startswith('/http/'):
            # Extract the actual URL after /http/
            target_url = self.path[6:]  # Remove '/http/' prefix
            try:
                # Decode URL if it's URL-encoded
                target_url = urllib.parse.unquote(target_url)

                # Make request to target URL
                req = urllib.request.Request(target_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                response = urllib.request.urlopen(req)

                # Send response headers
                self.send_response(response.status)
                for header, value in response.headers.items():
                    self.send_header(header, value)
                self.end_headers()

                # Copy response body
                self.wfile.write(response.read())
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        # Handle POST requests similarly
        if self.path.startswith('/http/'):
            target_url = self.path[6:]  # Remove '/http/' prefix
            try:
                target_url = urllib.parse.unquote(target_url)

                # Read POST data
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length) if content_length > 0 else b''

                # Make request to target URL
                req = urllib.request.Request(
                    target_url,
                    data=post_data,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Content-Type': self.headers.get('Content-Type', 'application/x-www-form-urlencoded')
                    },
                    method='POST'
                )
                response = urllib.request.urlopen(req)

                # Send response headers
                self.send_response(response.status)
                for header, value in response.headers.items():
                    self.send_header(header, value)
                self.end_headers()

                # Copy response body
                self.wfile.write(response.read())
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404, "Not Found")

if __name__ == "__main__":
    PORT = 8080
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Proxy server running at http://localhost:{PORT}")
        print(f"To access https://info.aec.edu.in/aus/default.aspx, visit: http://localhost:{PORT}/http/https://info.aec.edu.in/aus/default.aspx")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down proxy server...")
            httpd.shutdown()