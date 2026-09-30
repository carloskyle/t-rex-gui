# Cisco TRex ASTF Stateful Real-world Traffic (SFR mix)
from trex.astf.api import *

class SFRProfile():
    def get_profile(self, **kwargs):
        prog = ASTFProgram()
        prog.send_msg("PING\r\n")
        prog.recv_msg(1)
        ip_gen = ASTFIpGen(dist_client=ASTFIpGenDist(ip_range=["10.1.0.1", "10.1.0.255"]),
                           dist_server=ASTFIpGenDist(ip_range=["10.2.0.1", "10.2.0.255"]))
        template = ASTFTemplate(client_template=ASTFTCPClientTemplate(program=prog, ip_gen=ip_gen, port=443))
        return ASTFProfile(default_ip_gen=ip_gen, templates=template)

def register():
    return SFRProfile()
