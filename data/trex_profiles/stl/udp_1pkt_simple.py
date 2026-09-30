# Cisco TRex Stateless UDP Single Packet Benchmark
from trex_stl_lib.api import *

class STLS1(object):
    def __init__(self):
        self.fsize = 64

    def create_stream(self):
        # Create base packet and pad to size
        base_pkt = Ether()/IP(src="16.0.0.1", dst="48.0.0.1")/UDP(dport=12, sport=1025)
        pad = max(0, self.fsize - len(base_pkt)) * 'x'
        pkt = STLPktBuilder(pkt=base_pkt/pad)

        return STLStream(
            packet=pkt,
            mode=STLTXCont(percentage=100)
        )

    def get_streams(self, direction=0, **kwargs):
        return [self.create_stream()]

def register():
    return STLS1()
