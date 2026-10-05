# Cisco TRex ASTF (Advanced Stateful) HTTP Multi-Hop Site-to-Site Benchmark
from trex.astf.api import *

class HttpSitehopProfile():
    def __init__(self):
        pass

    def get_profile(self, **kwargs):
        # Client HTTP GET program
        prog_c = ASTFProgram()
        prog_c.send_msg("GET /sitehop/test HTTP/1.1\r\nHost: 10.69.70.20\r\nUser-Agent: TRex-ASTF-SiteHop\r\nConnection: keep-alive\r\nAccept: */*\r\n\r\n")
        prog_c.recv_msg(1)

        # Server HTTP 200 OK program
        prog_s = ASTFProgram()
        prog_s.recv_msg(1)
        body = "X" * 1460
        prog_s.send_msg("HTTP/1.1 200 OK\r\nServer: TRex-ASTF\r\nContent-Type: text/plain\r\nContent-Length: 1460\r\nConnection: keep-alive\r\n\r\n" + body)

        # Multi-Hop Client/Server IP Ranges (Port 0: 16.0.0.0/24 -> Port 1: 48.0.0.0/24)
        ip_gen_c = ASTFIpGenDist(ip_range=["16.0.0.1", "16.0.0.254"], distribution="seq")
        ip_gen_s = ASTFIpGenDist(ip_range=["48.0.0.1", "48.0.0.254"], distribution="seq")
        ip_gen = ASTFIpGen(glob=ASTFIpGenGlobal(ip_offset="1.0.0.0"),
                           dist_client=ip_gen_c,
                           dist_server=ip_gen_s)

        template = ASTFTemplate(client_template=ASTFTCPClientTemplate(program=prog_c, ip_gen=ip_gen, port=80),
                                server_template=ASTFTCPServerTemplate(program=prog_s))

        return ASTFProfile(default_ip_gen=ip_gen, templates=template)

def register():
    return HttpSitehopProfile()
