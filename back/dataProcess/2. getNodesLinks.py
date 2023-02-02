import json
import os
from alive_progress import alive_bar
import multiprocessing as mp
import numpy as np
import pandas as pd


# 获取每一个目标节点关联的Cert节点和IP节点
def getNodesWithCretAndIp(coreList, typeName, nowPath, nodeCsvW, linksAll, nowNodes):
    if(typeName == "IP"):
        startLinksType = "r_dns_a"
    else:
        startLinksType = "r_cert"
    nodePath = "ICLinks/"
    numList = int(len(nowNodes) / 6)
    # 每35000个IP节点为一组，进行循环
    nodeListNum = (coreList + 1) * numList
    if(coreList == 5):
        nodeListNum = None
    for i in nowNodes[coreList * numList: nodeListNum]:
        # 获取所有的node节点的NumId
        nodeListId = [i[0]]
        # 获取当前IP节点关联的所有链路
        linksByIP = []
        for j in linksAll[i[0] - 1]:
            if(j[0] == "r_asn" or j[0] == "r_cidr" or j[0] == "r_cert_chain"):
                continue
            else:
                linksByIP.append([j[0], j[1], j[2], int(j[3]), False])
        isTraverse = False
        # 判断当前链路是否全部循环完成
        while(not isTraverse):
            # 针对所有链路中的每一个节点进行查询
            for k in linksByIP:
                # 当节点循环终止条件为真或已经达到三跳后不在进行循环
                if(k[-1] == True or k[3] <= 0):
                    k[-1] = True
                    continue
                # 当前节点为连接IP的节点（只有初始IP节点才会进入循环），只循环其source节点
                if(k[0] == startLinksType):
                    k[-1] = True
                    if(k[1] not in nodeListId):
                        linksByIP.extend(getLinksByLinkType(
                            linksAll[int(k[1]) - 1], k[3], nodeListId))
                        nodeListId.append(k[1])
                # 循环链路的所有节点
                else:
                    k[-1] = True
                    if(k[1] not in nodeListId):
                        linksByIP.extend(getLinksByLinkType(
                            linksAll[int(k[1]) - 1], k[3], nodeListId))
                        nodeListId.append(k[1])
                    if(k[2] not in nodeListId):
                        linksByIP.extend(getLinksByLinkType(
                            linksAll[int(k[2]) - 1], k[3], nodeListId))
                        nodeListId.append(k[2])
            # 判断所有节点是否循环完成
            isTraverse = True
            for k in linksByIP:
                if(k[-1] == False):
                    isTraverse = False
        # 分别存储所有Cert节点、IP节点、所有节点
        certList = []
        nodeList = []
        nodeListId = []
        ipList = []

        # 获取所有的IP、Cert节点
        for j in linksByIP:
            nodeListId.append(int(j[1]) - 1)
            nodeListId.append(int(j[2]) - 1)
            if(nodeCsvW[int(j[1]) - 1][3] == "Cert"):
                certList.append(int(j[1]) - 1)
            elif(nodeCsvW[int(j[1]) - 1][3] == "IP"):
                ipList.append(int(j[1]) - 1)
            if(nodeCsvW[int(j[2]) - 1][3] == "Cert"):
                certList.append(int(j[2]) - 1)
            elif(nodeCsvW[int(j[2]) - 1][3] == "IP"):
                ipList.append(int(j[2]) - 1)

        # 获取所有的节点
        nodeListId = list(set(nodeListId))
        for j in nodeListId:
            nodeList.append(list(nodeCsvW[j]))

        # 获取所有的Cert节点信息
        setCertList = set(certList)
        # 删除当前节点的信息
        setCertList.discard(int(i[0] - 1))
        dictCertList = []
        for item in setCertList:
            dictCertList.append([list(nodeCsvW[item]), certList.count(item)])
        # 根据连接到该节点的Links的数量进行排序
        dictCertList.sort(reverse=True, key=lambda x: x[1])

        # 获取当前所有的IP节点的信息
        setIpList = set(ipList)
        # 删除当前节点的信息
        setIpList.discard(int(i[0] - 1))
        dictIpList = []
        for item in setIpList:
            dictIpList.append([list(nodeCsvW[item]), ipList.count(item)])
        # 根据连接到该节点的Links的数量进行排序
        dictIpList.sort(reverse=True, key=lambda x: x[1])
        nodeLinks = {
            "beginNode": list(i),
            "certEnd": dictCertList,
            "ipEnd": dictIpList,
            "nodes": nodeList,
            "links": linksByIP
        }
        with open(nowPath + nodePath + str(i[0]) + ".json", 'w', encoding='utf-8') as f:
            json.dump(nodeLinks, f, ensure_ascii=False)
    print(coreList)


# 根据链路列表和跳转次数，对链路添加响应的数据
def getLinksByLinkType(linkList, indexNum, nodeListId):
    nowLinksById = []
    for listLinkTemp in linkList:
        # 判断当前跳数，如果为第4跳，则只保存IC的links
        if(indexNum - 1 == 0):
            if(listLinkTemp[0] == "r_cert" or listLinkTemp[0] == "r_dns_a"):
                nowLinksById.append(
                    [listLinkTemp[0], listLinkTemp[1], listLinkTemp[2], indexNum - 1, True])
        else:
            if(listLinkTemp[1] in nodeListId or listLinkTemp[2] in nodeListId):
                continue
            if(listLinkTemp[0] == "r_asn" or listLinkTemp[0] == "r_cidr" or listLinkTemp[0] == "r_cert_chain"):
                continue
            elif(listLinkTemp[0] == "r_cert" or listLinkTemp[0] == "r_dns_a" or listLinkTemp[0] == "r_cname" or listLinkTemp[0] == "r_whois_name" or listLinkTemp[0] == "r_whois_email" or listLinkTemp[0] == "r_whois_phone"):
                nowLinksById.append(
                    [listLinkTemp[0], listLinkTemp[1], listLinkTemp[2], indexNum - 1, True])
            else:
                nowLinksById.append(
                    [listLinkTemp[0], listLinkTemp[1], listLinkTemp[2], indexNum - 1, False])
    return nowLinksById


# 筛选所有IP节点，将关联其他IP和Cert节点的IP筛选出来
def screenNode(nowPath, coreList, nowNodes):
    numList = int(len(nowNodes) / 12)
    nodePath = "ICLinks/"
    nodeListNum = (coreList + 1) * numList
    if(coreList == 11):
        nodeListNum = None
    nodeInfo = []
    for i in nowNodes[coreList * numList: nodeListNum]:
        f = open(nowPath + nodePath +
                 str(i) + ".json", 'r', encoding='utf-8')
        ipJson = json.load(f)
        nodeDomain = 0
        industryNum = 0
        ipCert = len(ipJson["certEnd"])

        ipIp = len(ipJson["ipEnd"])
        for j in ipJson["nodes"]:
            if(j[-2] == "Domain"):
                nodeDomain += 1
                if(not j[-1] == "  "):
                    industryNum += 1
        nodeInfo.append([i, ipCert, ipIp, nodeDomain, industryNum])
    with open(nowPath + nodePath + "ICLinksInfo" + str(coreList) + ".json", 'w', encoding='utf-8') as f:
        json.dump(nodeInfo, f, ensure_ascii=False)


def getICDomainInfo(linksAll, nodeCsvW, useIC):
    Ip = []
    Cert = []
    ipIndustryJson = {}
    nodesneighbor = {}
    for i in useIC:
        nodesneighbor[str(i)] = []
        nowIcInfo = nodeCsvW[i - 1]
        ipIndustry = []
        numConnectedDomain = 0
        numDomainWithIn = 0
        for j in linksAll[i - 1]:
            if(j[2] == i):
                nodesneighbor[str(i)].append([j[1], j])
                numConnectedDomain += 1
                nowNodeInfo = nodeCsvW[j[1] - 1]
                if(nowNodeInfo[-1] != "  "):
                    ipIndustry.append(nowNodeInfo[-1])
                    numDomainWithIn += 1
            else:
                nodesneighbor[str(i)].append([j[2], j])

        ipIndustrySet = list(set(ipIndustry))
        ipIndustrySet.sort()
        ipIndustryNum = []
        for j in ipIndustrySet:
            ipIndustryNum.append([j, ipIndustry.count(j)])

        ipIndustryJson[str(i)] = ipIndustryNum
        if(nowIcInfo[3] == "IP"):
            Ip.append({
                "numId": nowIcInfo[0],
                "Id": nowIcInfo[1],
                "name": nowIcInfo[2],
                "numConnectedDomain": numConnectedDomain,
                "numDomainWithIn": numDomainWithIn,
                "rateIn": numDomainWithIn/numConnectedDomain,
                "industryType": ipIndustrySet
            })
        elif(nowIcInfo[3] == "Cert"):
            Cert.append({
                "numId": nowIcInfo[0],
                "Id": nowIcInfo[1],
                "name": nowIcInfo[2],
                "numConnectedDomain": numConnectedDomain,
                "numDomainWithIn": numDomainWithIn,
                "rateIn": numDomainWithIn/numConnectedDomain,
                "industryType": ipIndustrySet
            })
    return [{
        "IP": Ip,
        "Cert": Cert
    }, ipIndustryJson, nodesneighbor]


if __name__ == '__main__':
    nowPath = os.path.abspath(os.path.dirname(
        os.path.dirname(__file__))) + "/data/"
    # 打开所有的节点
    # nodeCsvW = pd.read_csv(
    #     nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumIdNow.csv", header=0)
    # linkCsvW = open(
    #     nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/nodeLinksJson.json", 'r', encoding='utf-8')
    # linksAll = json.load(linkCsvW)
    # linkCsvW.close()
    # ipNode = nodeCsvW[nodeCsvW["type"] == "IP"].values
    # certNode = nodeCsvW[nodeCsvW["type"] == "Cert"].values
    # nodeCsvW = nodeCsvW.values

    # # 获取每个IP节点连接的IP和Cert节点
    # print("获取每个IP节点连接的IP和Cert节点---------------------------------------------")
    # pool = mp.Pool(processes=6)
    # for i in range(6):
    #     pool.apply_async(getNodesWithCretAndIp, args=(
    #         i, "IP", nowPath, nodeCsvW, linksAll, ipNode))
    #     print(i)
    # pool.close()
    # pool.join()

    # # 获取每个Cert节点连接的IP和Cert节点
    # print("获取每个Cert节点连接的IP和Cert节点---------------------------------------------")
    # pool = mp.Pool(processes=6)
    # for i in range(6):
    #     pool.apply_async(getNodesWithCretAndIp, args=(
    #         i, "Cert", nowPath,  nodeCsvW, linksAll, certNode))
    #     print(i)
    # pool.close()
    # pool.join()
    # # 获取每个Cert节点连接的IP节点和Cert节点数量和其对应链路的黑灰产业的Domain数量
    # allIC = []
    # for i in ipNode:
    #     allIC.append(i[0])
    # for i in certNode:
    #     allIC.append(i[0])
    # allIC.sort()
    # print("获取每个IC节点连接IC节点数量和其对应链路的黑灰产业的Domain数量--------------------------")
    # pool = mp.Pool(processes=12)
    # for i in range(12):
    #     pool.apply_async(screenNode, args=(nowPath, i, allIC))
    #     print(i)
    # pool.close()
    # pool.join()

    # # 获取筛选后的所有Ip节点
    # print("获取筛选后的所有IC节点----------------------------------------------")
    # AllIp = []
    # IpInCert = []
    # IpAlone = []
    # IpAlonePure = []
    # IpPure = []
    # for i in range(12):
    #     nowIpJ = open(nowPath + "ICLinks/ICLinksInfo" +
    #                   str(i) + ".json", "r", encoding='utf-8')
    #     nowIp = json.load(nowIpJ)
    #     for i in nowIp:
    #         AllIp.append(list(i))
    #         if((i[1] > 0 or i[2] > 0) and i[4] > 0):
    #             IpInCert.append(i[0])
    #         elif(i[1] == 0 and i[2] == 0 and i[4] > 0):
    #             IpAlone.append(i[0])
    #         elif(i[1] == 0 and i[2] == 0 and i[4] == 0):
    #             IpAlonePure.append(i[0])
    #         elif((i[1] > 0 or i[2] > 0) and i[4] == 0):
    #             IpPure.append(i[0])
    # IpInCert.sort()
    # IpAlone.sort()
    # IpAlonePure.sort()
    # IpPure.sort()
    # print(len(IpInCert))
    # print(len(IpAlone))
    # print(len(IpAlonePure))
    # print(len(IpPure))
    # with open(nowPath + "ICScreen.json", 'w', encoding='utf-8') as f:
    #     json.dump([IpInCert, IpAlone, IpAlonePure, IpPure],
    #               f, ensure_ascii=False)
    with open(nowPath + "ICScreen.json", 'r', encoding='utf-8') as f:
        ICScreen = json.load(f)
        with alive_bar(len(ICScreen[1])) as bar:
            for i in ICScreen[1]:
                with open(nowPath + "ICLinks/" + str(i) + ".json", "r", encoding="utf-8") as f:
                    nowICLinksInfo = json.load(f)
                    with open(nowPath + "ICAloneLinks/" + str(i) + ".json", "w", encoding="utf-8") as f2:
                        json.dump(nowICLinksInfo, f2, ensure_ascii=False)
                bar()
        # nowICInfo1 = getICDomainInfo(linksAll, nodeCsvW, ICScreen[0])
        # nowICInfo2 = getICDomainInfo(linksAll, nodeCsvW, ICScreen[1])
        # ICDomainInfo = [nowICInfo1[0], nowICInfo2[0]]
        # ICIndustryInfo = nowICInfo1[1]
        # ICIndustryInfo.update(nowICInfo2[1])
        # ICIndustryInfo
        # ICneighbor = nowICInfo1[2]
        # ICneighbor.update(nowICInfo2[1])
        # with open(nowPath + "ICIndustryInfo.json", "w", encoding="utf-8") as f:
        #     json.dump(ICIndustryInfo, f, ensure_ascii=False)
        # with open(nowPath + "ICneighbor.json", "w", encoding="utf-8") as f:
        #     json.dump(ICneighbor, f, ensure_ascii=False)
        # with open(nowPath + "ICDomainInfo.json", "w", encoding="utf-8") as f:
        #     json.dump(ICDomainInfo, f, ensure_ascii=False)
        # print(1)
