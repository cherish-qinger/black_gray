from copy import deepcopy
import json
import os
from alive_progress import alive_bar
import multiprocessing as mp
import pandas as pd
import time


def mergeNodesByWhois(nodes, linksByNodes, nodeCsv):
    with alive_bar(len(nodes)) as bar:
        # 针对所有的节点进行循环
        for nowNodeInfo in nodes:
            linksNode = []
            ipAndCertNode = []

            # 获取节点两跳后连接的所有IP和Cert节点
            for nowNodeLinks in linksByNodes[nowNodeInfo[0] - 1]:
                if(not nowNodeLinks[2] == nowNodeInfo[0]):
                    continue
                for nextNodeLinks in linksByNodes[nowNodeLinks[1] - 1]:
                    if(nextNodeLinks[0] == "r_dns_a" or nextNodeLinks[0] == "r_cert"):
                        ipAndCertNode.append(nextNodeLinks[2])
                        linksNode.append(nextNodeLinks)
            ipAndCertNodeSet = list(set(ipAndCertNode))
            ipAndCertNodeSet.sort()
            ipAndCertNodeLinks = [[] for i in range(len(ipAndCertNodeSet))]

            # 根据连接的IP和Cert节点进行数据存储
            for linksTemp in linksNode:
                ipAndCertNodeLinks[ipAndCertNodeSet.index(linksTemp[2])].append(linksTemp)
            startNum = 0
            # 获取当前节点的属性和节点的NumId
            whoisRelation = linksByNodes[nowNodeInfo[0] - 1][0][0]
            whoisNumId =  nowNodeInfo[0]
            # 对所有的节点进行循环
            for nodeLinksTempInfo in ipAndCertNodeLinks[: -1]:
                # 获取当前节点的属性（IP/Cert)和NumId
                nowNodeRelation = nodeLinksTempInfo[0][0]
                nowNodeNumId = nodeLinksTempInfo[0][2]
                startNum += 1
                nodesToNowNode = []
                # 获取连接当前IP/Cert的其他节点
                for nodeInfoTemp in nodeLinksTempInfo:
                    nodesToNowNode.append(nodeInfoTemp[1])

                # 读取存储当前节点信息的文档
                nodePath = nowPath + "LinksByIPScreen/" + str(nodeLinksTempInfo[0][2]) + ".json"
                if(nodeLinksTempInfo[0][0] == "r_cert"):
                    nodePath = nowPath + "LinksByCertScreen/" + str(nodeLinksTempInfo[0][2]) + ".json"
                fileExist = False
                nowNodeData = []
                
                # 判断当前节点是否存在文件
                if(os.path.exists(nodePath)):
                    fileExist = True
                    f = open(nodePath, "r", encoding="utf-8")
                    nowNodeData = json.load(f)
                
                # 对其他的节点进行循环，使节点两两匹配
                for nextNodeLinksTempInfo in ipAndCertNodeLinks[startNum:]:
                    
                    # 获取匹配节点的信息(IP/Cert和NumId)
                    nodesToNowNodeTemp = deepcopy(nodesToNowNode)
                    nextNodeRelation = nextNodeLinksTempInfo[0][0]
                    nextNodeNumId = nextNodeLinksTempInfo[0][2]

                    nodesInWhois = []
                    nodesNotInWhois = []
                    
                    # 获取连接匹配IP/Cert的其他节点
                    nodesToNextNode = []
                    for nextnodeInfoTemp in nextNodeLinksTempInfo:
                        nodesToNextNode.append(nextnodeInfoTemp[1])
                    
                    # 判断连接的节点是否已经存在于节点链接图中
                    for nodesToNextNodeTemp in nodesToNextNode:
                        if(nodesToNextNodeTemp in nodesToNowNodeTemp):
                            nodesNotInWhois.append(nodesToNextNodeTemp)
                            nodesToNowNodeTemp.remove(nodesToNextNodeTemp)
                        else:
                            nodesInWhois.append(nodesToNextNodeTemp)

                    linksNextInWhois = []
                    linskNowInWhois = []
                    linksNotInWhois = []
                    # 根据节点信息存储links信息
                    for nodesTemp in nodesInWhois:
                        linksNextInWhois.append([nextNodeRelation, nodesTemp,nextNodeNumId, 0, True])
                        linksNextInWhois.append([whoisRelation, nodesTemp, whoisNumId, 1, True])

                    for nodesTemp in nodesToNowNodeTemp:
                        linskNowInWhois.append([nowNodeRelation, nodesTemp, nowNodeNumId, 3, True])
                        linskNowInWhois.append([whoisRelation, nodesTemp, whoisNumId, 2, True])

                    
                    for nodesTemp in nodesNotInWhois:
                        linksNotInWhois.append([nowNodeRelation, nodesTemp,nowNodeNumId, 3, True])
                        linksNotInWhois.append([nextNodeRelation, nodesTemp,nextNodeNumId, 2, True])
                    
                    # 将链接存入数据中
                    nodeToNodelinks = []
                    nodeInJson = False
                    nodeListNum = 0
                    if(fileExist):
                        for dataTemp in range(len(nowNodeData)):
                            if(nowNodeData[dataTemp]["end"][0] == nextNodeNumId):
                                nowNodeData[dataTemp]["links"].extend(linksNextInWhois)
                                nodeToNodelinks = nowNodeData[dataTemp]["links"]
                                nodeListNum = dataTemp
                                nodeInJson = True
                                continue
                    if(not nodeInJson):
                        nodeToNodelinks.extend(linskNowInWhois)
                        nodeToNodelinks.extend(linksNextInWhois)
                        nodeToNodelinks.extend(linksNotInWhois)
                    nodeList = []
                    nodeListId = []
                    # 获取所有的IP、Cert节点
                    for linksTemp in nodeToNodelinks:
                        nodeListId.append(int(linksTemp[1]) - 1)
                        nodeListId.append(int(linksTemp[2]) - 1)
                    # 获取所有的节点
                    allDomainNodeNum = 0
                    allDomainInstduryNodeNum = 0
                    nodeToTargetInfo = []
                    nodeListId = list(set(nodeListId))
                    for j in nodeListId:
                        nodeList = list(nodeCsv[j])
                        if(nodeList[-2] == "Domain"):
                            allDomainNodeNum += 1
                            if(not nodeList[-1] == "[]"):
                                allDomainInstduryNodeNum += 1
                        nodeToTargetInfo.append(nodeList)
                    
                    if(nodeInJson):
                        nowNodeData[nodeListNum]["nodes"] = nodeToTargetInfo
                        nowNodeData[nodeListNum]["nodeNum"] =  len(nodeListId)
                        nowNodeData[nodeListNum]["domainNum"] =  allDomainNodeNum
                        nowNodeData[nodeListNum]["industryNum"] =  allDomainInstduryNodeNum
                    else:
                        nowNodeData.append({
                            "begin": list(nodeCsv[nowNodeNumId -1]),
                            "end":list(nodeCsv[nextNodeNumId -1]),
                            "nodes":nodeToTargetInfo,
                            "links": nodeToNodelinks,
                            "nodeNum": len(nodeListId),
                            "domainNum": allDomainNodeNum,
                            "industryNum":allDomainInstduryNodeNum,
                        })
                f = open(nodePath, "w", encoding="utf-8")
                json.dump(nowNodeData, f, ensure_ascii=False)
                    
            bar()


if __name__ == '__main__':
    nowPath = "./data/"
    # 打开所有的节点
    nodeCsvW = pd.read_csv(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumId.csv", header=0)
    nodeCsv = nodeCsvW.values
    # 获取所有的Whois节点数据
    WhoisName = nodeCsvW[nodeCsvW["type"] == "Whois_Name"].values
    WhoisPhone = nodeCsvW[nodeCsvW["type"] == "Whois_Phone"].values
    WhoisEmail = nodeCsvW[nodeCsvW["type"] == "Whois_Email"].values
    linksByNodesJ = open(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/nodeLinksJson.json", "r", encoding="utf-8")
    linksByNodes = json.load(linksByNodesJ)

    mergeNodesByWhois(WhoisName, linksByNodes, nodeCsv)
