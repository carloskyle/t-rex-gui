# Cisco TRex ASTF (Advanced Stateful) HTTP 1.1 Emulation
from trex.astf.api import *

class Prof1():
    def __init__(self):
        pass

    def get_profile(self, **kwargs):
        # Client program: send GET /index.html and expect HTTP 200 OK
        prog_c = ASTFProgram()
        prog_c.send_msg("GET /3322 HTTP/1.1\r\nHost: 10.69.70.20\r\nUser-Agent: TRex-Client\r\nAccept: */*\r\n\r\n")
        prog_c.recv_msg(1)

        # Server program: accept and return 200 OK
        prog_s = ASTFProgram()
        prog_s.recv_msg(1)
        prog_s.send_msg("HTTP/1.1 200 OK\r\nServer: TRex-Sim\r\nContent-Length: 1024\r\n\r\n" + "X" * 1024)

        # Association IP template
        ip_gen_c = ASTFIpGenDist(ip_range=["16.0.0.1", "16.0.0.254"], distribution="seq")
        ip_gen_s = ASTFIpGenDist(ip_range=["48.0.0.1", "48.0.0.254"], distribution="seq")
        ip_gen = ASTFIpGen(glob=ASTFIpGenGlobal(ip_offset="1.0.0.0"),
                           dist_client=ip_gen_c,
                           dist_server=ip_gen_s)

        template = ASTFTemplate(client_template=ASTFTCPClientTemplate(program=prog_c, ip_gen=ip_gen, port=80),
                                server_template=ASTFTCPServerTemplate(program=prog_s))

        return ASTFProfile(default_ip_gen=ip_gen, templates=template)

def register():
    return Prof1()
