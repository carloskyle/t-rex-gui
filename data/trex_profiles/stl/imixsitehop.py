# Cisco TRex Stateless IMIX Site-to-Site Multi-Hop Benchmark
from trex_stl_lib.api import *

class STLS1(object):
    def __init__(self):
        self.fsize_mix = [(64, 58), (594, 33), (1518, 9)]

    def create_stream(self, fsize, pps):
        base_pkt = Ether()/IP(src="16.0.0.1", dst="48.0.0.1")/UDP(dport=12, sport=1025)
        pad = max(0, fsize - len(base_pkt)) * 'x'
        pkt = STLPktBuilder(pkt=base_pkt/pad)
        return STLStream(
            packet=pkt,
            mode=STLTXCont(pps=pps)
        )

    def get_streams(self, direction=0, **kwargs):
        streams = []
        for fsize, weight in self.fsize_mix:
            streams.append(self.create_stream(fsize, weight * 1000))
        return streams

def register():
    return STLS1()
