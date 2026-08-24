#!/usr/bin/env python3
"""Static server for the Approval prototypes, with caching turned off.

`python3 -m http.server` sends weak validators, so Chrome happily serves a
cached css/js after an edit — which repeatedly looked like a broken change
during development (the page had one .td-stack rule while disk had another).
This is the same server with `Cache-Control: no-store` on every response.

    python3 serve.py [port]        # default 8747

Still no build step: it only serves the files as they are on disk.
"""
import functools
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8747
    handler = functools.partial(NoCacheHandler, directory=".")
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving {port} with no-store  ->  http://localhost:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
