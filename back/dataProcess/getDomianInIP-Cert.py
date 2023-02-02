import json
# import numpy as np
# import pandas as pd
from alive_progress import alive_bar
import networkx as nx
import csv

def getDomainInIp_Cert(nowNode,nodeType,nodeCsv, nowPath):
    nodePath = "LinksByIPScreen/"
    if(nodeType == "Cert"):
        nodePath = "LinksByCertScreen/"
    with alive_bar(len(nowNode)) as bar:
        for i in nowNode:
            nodeLinksJ = open(nowPath + nodePath + str(i[0]) + ".json", "r", encoding="utf-8")
            nodeLinks = json.load(nodeLinksJ)
            for j in nodeLinks:
                nowIpCertLinks = [i[0], j["end"][0]] 
                for k in j["nodes"]:
                    nodeCsv[k[0] - 1].append(nowIpCertLinks)
            bar()
    return nodeCsv
                


if __name__ == '__main__':
    nowPath = "./data/"
    # 打开所有的节点
    nodeCsvW = open(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumId.csv", "r",encoding="utf-8")
    next(nodeCsvW)
    nodeCsvW = csv.reader(nodeCsvW)
    nodeCsv = []
    for i in nodeCsvW:
        nodeCsv.append(i)
    ipNodesJ = open(nowPath + "LinksByIP/IpScreen.json", "r", encoding="utf-8")
    ipNodes = json.load(ipNodesJ)
    nodeCsv = getDomainInIp_Cert(ipNodes, "IP", nodeCsv, nowPath)
    certNodesJ = open(nowPath + "LinksByCert/certScreen.json", "r", encoding="utf-8")
    certNodes = json.load(certNodesJ)
    nodeCsv = getDomainInIp_Cert(certNodes, "Cert", nodeCsv, nowPath)
    
    nodeInIPCertJ = open(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeInIPCert.json", "w",encoding="utf-8")
    json.dump(nodeCsv, nodeInIPCertJ, ensure_ascii=False)
    
