import json
from operator import imod
import os
from platform import node
import pandas as pd
import multiprocessing as mp
import time
from alive_progress import alive_bar
import sys


def getIPCertLinksInSkip3(nowPath, nowNodeNumId, nodeToNodeInfo, nodeCsvW):
    # print("第", coreList, "个线程开始执行了----------------",
    #       time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()))

    # with alive_bar(len(nodes)) as bar:
    # for i in nodes:
    WhoisName = 0
    WhoisEmail = 0
    WhoisPhone = 0
    pureDomain = 0
    dirtyDomain = 0
    skipNum = 0
    allNodes1 = []
    for j in nodeToNodeInfo[str(nowNodeNumId)]:
        allNodes1.append(j[1])
    allLinks = {
    }
    nowNodesInfo = list(nodeCsvW[int(nowNodeNumId) - 1])
    # 第0层数据
    allLinks = {
        "id": nowNodesInfo[1],
        "nodesNum": 0,
        "WhoisName": 0,
        "WhoisEmail": 0,
        "WhoisPhone": 0,
        "pureDomain": 0,
        "dirtyDomain": 0,
        "numId": str(nowNodesInfo[0]),
        "name": nowNodesInfo[2],
        "children": []
    }
    # 针对第0层数据的链路添加第一层数据
    for j in nodeToNodeInfo[str(nowNodeNumId)]:
        nowNodesInfo = list(nodeCsvW[int(j[1]) - 1])
        allLinks["children"].append({
            "id": nowNodesInfo[1],
            "nodesNum": j[2] - 2,
            "WhoisName": j[5],
            "WhoisEmail": j[6],
            "WhoisPhone": j[7],
            "pureDomain": j[3] - j[4],
            "dirtyDomain": j[4],
            "numId": str(nowNodesInfo[0]),
            "name": nowNodesInfo[2],
            "children": []
        })
        WhoisName = max(WhoisName, j[5])
        WhoisEmail = max(WhoisEmail, j[6])
        WhoisPhone = max(WhoisPhone, j[7])
        pureDomain = max(pureDomain, j[3] - j[4])
        dirtyDomain = max(dirtyDomain, j[4])
        skipNum = max(skipNum, 1)
        # 第二层数据
        for k in nodeToNodeInfo[str(j[1])]:
            # 如果第二层数据和第0层数据相等，则跳过A-B-A
            if(k[1] == int(nowNodeNumId)):
                continue
            nowNodesInfo = list(nodeCsvW[int(k[1]) - 1])
            isInFirst = False
            if(int(k[1]) in allNodes1):
                isInFirst = True
            allLinks["children"][-1]["children"].append({
                "id": nowNodesInfo[1],
                "nodesNum": k[2] - 2,
                "WhoisName": k[5],
                "WhoisEmail": k[6],
                "WhoisPhone": k[7],
                "pureDomain": k[3] - k[4],
                "dirtyDomain": k[4],
                "numId": str(nowNodesInfo[0]),
                "name": nowNodesInfo[2],
                "isInFirst": isInFirst,
                "children": []
            })
            WhoisName = max(WhoisName, k[5])
            WhoisEmail = max(WhoisEmail, k[6])
            WhoisPhone = max(WhoisPhone, k[7])
            pureDomain = max(pureDomain, k[3] - k[4])
            dirtyDomain = max(dirtyDomain, k[4])
            skipNum = max(skipNum, 1)
    allLinks.update({
        "WhoisNameNum": WhoisName,
        "WhoisPhoneNum": WhoisPhone,
        "WhoisEmailNum": WhoisEmail,
        "pureDomainNum": pureDomain,
        "dirtyDomainNum": dirtyDomain,
        "skipNum": skipNum
    })
    with open(nowPath + "ic-clue-data/" + str(nowNodeNumId) + ".json", 'w', encoding='utf-8') as f:
        json.dump([allLinks], f, ensure_ascii=False)
    # print("第", coreList, "个线程执行完成了----------------",
    #       time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()))


def getNodesInICLinks(nowPath, nowNodeNumId, nodeToNodeInfo, nodeCsvW, nodeAloneInfo):
    nodeICLinksJ = open(nowPath + "nodesInICLinks.json", "r", encoding="utf-8")
    nodeICLinks = json.load(nodeICLinksJ)
    allLinks = []
    listLinks = []
    listNode = []
    for i in nodeICLinks[str(nowNodeNumId)]:
        if(isinstance(i, list)):
            listLinks.append(i)
        else:
            listNode.append(i)
    nowICNode = []
    for i in listLinks:
        nowICNode.extend(i)
    nowICNodeSet = list(set(nowICNode))
    nowICNodeCount = []
    for i in nowICNodeSet:
        nowICNodeCount.append([i, nowICNode.count(i)])
    nowICNodeCount.sort(reverse=True, key=lambda x: x[1])

    nowICNodeSet = []
    for i in nowICNodeCount:
        nowICNodeSet.append(i[0])
    while(len(nowICNodeSet) > 0):
        for i in nowICNodeCount:
            if(not i[0] in nowICNodeSet):
                continue
            nowICNodeSet.remove(i[0])
            nowLinks = {}
            WhoisName = 0
            WhoisPhone = 0
            WhoisEmail = 0
            pureDomain = 0
            dirtyDomain = 0
            skipNum = 0
            allNodes1 = []
            for j in nodeToNodeInfo[str(i[0])]:
                allNodes1.append(j[1])
            nowNodesInfo = list(nodeCsvW[int(i[0]) - 1])
            nowLinks = {
                "id": nowNodesInfo[1],
                "nodesNum": 0,
                "WhoisName": 0,
                "WhoisPhone": 0,
                "WhoisEmail": 0,
                "pureDomain": 0,
                "dirtyDomain": 0,
                "numId": str(nowNodesInfo[0]),
                "name": nowNodesInfo[2],
                "children": []
            }
            # 针对第0层数据的链路添加第一层数据
            for j in nodeToNodeInfo[str(i[0])]:
                nowICLink = [min(j[0], j[1]), max(j[0], j[1])]
                if((not nowICLink in listLinks)):
                    continue
                listLinks.remove(nowICLink)

                nowICNodeSet.remove(j[1])
                nowNodesInfo = list(nodeCsvW[int(j[1]) - 1])
                nowLinks["children"].append({
                    "id": nowNodesInfo[1],
                    "nodesNum": j[2] - 2,
                    "WhoisName": j[5],
                    "WhoisEmail": j[6],
                    "WhoisPhone": j[7],
                    "pureDomain": j[3] - j[4],
                    "dirtyDomain": j[4],
                    "numId": str(nowNodesInfo[0]),
                    "name": nowNodesInfo[2],
                    "children": []
                })
                WhoisName = max(WhoisName, j[5])
                WhoisPhone = max(WhoisPhone, j[6])
                WhoisEmail = max(WhoisEmail, j[7])
                pureDomain = max(pureDomain, j[3] - j[4])
                dirtyDomain = max(dirtyDomain, j[4])
                skipNum = max(skipNum, 1)
                # 第二层数据
                for k in nodeToNodeInfo[str(j[1])]:
                    # 如果第二层数据和第0层数据相等，则跳过A-B-A
                    if(k[1] == int(nowNodeNumId)):
                        continue

                    nowICLink = [min(k[0], k[1]), max(k[0], k[1])]
                    if((not nowICLink in listLinks)):
                        continue
                    listLinks.remove(nowICLink)
                    nowNodesInfo = list(nodeCsvW[int(k[1]) - 1])
                    isInFirst = False
                    if(int(k[1]) in allNodes1):
                        isInFirst = True
                    nowLinks["children"][-1]["children"].append({
                        "id": nowNodesInfo[1],
                        "nodesNum": k[2] - 2,
                        "WhoisName": k[5],
                        "WhoisEmail": k[6],
                        "WhoisPhone": k[7],
                        "pureDomain": k[3] - k[4],
                        "dirtyDomain": k[4],
                        "numId": str(nowNodesInfo[0]),
                        "name": nowNodesInfo[2],
                        "isInFirst": isInFirst,
                        "children": []
                    })
                    WhoisName = max(WhoisName, k[5])
                    WhoisPhone = max(WhoisPhone, k[6])
                    WhoisEmail = max(WhoisEmail, k[7])
                    pureDomain = max(pureDomain, k[3] - k[4])
                    dirtyDomain = max(dirtyDomain, k[4])
                skipNum = max(skipNum, 2)
            nowLinks.update({
                "WhoisNameNum": WhoisName,
                "WhoisPhoneNum": WhoisPhone,
                "WhoisEmailNum": WhoisEmail,
                "pureDomainNum": pureDomain,
                "dirtyDomainNum": dirtyDomain,
                "skipNum": skipNum
            })
            if(len(nowLinks["children"]) == 0):
                continue
            allLinks.append(nowLinks)

    for i in listNode:
        nowNodesInfo = list(nodeCsvW[int(i) - 1])
        nowNodeLinkInfo = nodeAloneInfo[str(i)]
        nowLinks = {
            "id": nowNodesInfo[1],
            "nodesNum": nowNodeLinkInfo[0],
            "WhoisName": nowNodeLinkInfo[3],
            "WhoisEmail": nowNodeLinkInfo[4],
            "WhoisPhone": nowNodeLinkInfo[5],
            "pureDomain": nowNodeLinkInfo[1],
            "dirtyDomain": nowNodeLinkInfo[2],
            "numId": str(nowNodesInfo[0]),
            "name": nowNodesInfo[2],
            "children": [],
            "WhoisNameNum": nowNodeLinkInfo[3],
            "WhoisEmailNum": nowNodeLinkInfo[4],
            "WhoisPhoneNum": nowNodeLinkInfo[5],
            "pureDomainNum": nowNodeLinkInfo[1],
            "dirtyDomainNum": nowNodeLinkInfo[2],
            "skipNum": 0
        }
        allLinks.append(nowLinks)

    with open(nowPath + "ic-clue-data/" + str(nowNodeNumId) + ".json", 'w', encoding='utf-8') as f:
        json.dump(allLinks, f, ensure_ascii=False)


if __name__ == '__main__':
    nowPath = os.path.abspath(os.path.dirname(
        os.path.dirname(__file__))) + "/data/"
    if(not os.path.exists(nowPath + "ic-clue-data/" + str(sys.argv[1]) + ".json")):
        nodeCsvW = pd.read_csv(
            nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumId.csv", header=0)
        nodeCsvW = nodeCsvW.values
        with open(nowPath + "nodesToNodesGraph1.json", 'r', encoding='utf-8') as f:
            nodeToNodeInfo = json.load(f)
            if(sys.argv[2] == "IP" or sys.argv[1] == "Cert"):
                getIPCertLinksInSkip3(
                    nowPath, sys.argv[1], nodeToNodeInfo, nodeCsvW)
            else:
                with open(nowPath + "nodesAloneInfo.json", 'r', encoding='utf-8') as f:
                    nodeAloneInfo = json.load(f)
                    getNodesInICLinks(
                        nowPath, sys.argv[1], nodeToNodeInfo, nodeCsvW, nodeAloneInfo)