from genericpath import exists
import json
from math import ceil
import multiprocessing as mp
import os
import pandas as pd
import time
from alive_progress import alive_bar

# 获取每一个目标节点关联的Cert节点和IP节点
def getNodesWithCretAndIp(coreList, typeName, nowPath, nodeCsvW, linksAll, nowNodes):
    if(typeName == "IP"):
        startLinksType = "r_dns_a"
        nodePath = "LinksByIP/"
    else:
        startLinksType = "r_cert"
        nodePath = "LinksByCert/"
    numList = int(len(nowNodes)/12)
    # 每35000个IP节点为一组，进行循环
    nodeListNum = (coreList + 1) * numList
    if((coreList + 1) * numList > len(nowNodes)):
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
                if(k[-1] == True or k[3] == 0):
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
        if(indexNum - 1 == 0):
            if(listLinkTemp[0] == "r_cert" or listLinkTemp[0] == "r_dns_a"):
                nowLinksById.append(
                    [listLinkTemp[0], listLinkTemp[1], listLinkTemp[2], indexNum - 1, True])
        else:
            if(listLinkTemp[1] in nodeListId or listLinkTemp[2] in nodeListId):
                continue
            if(listLinkTemp[0] == "r_asn" or listLinkTemp[0] == "r_cidr" or listLinkTemp[0] == "r_cert_chain"):
                continue
            elif(listLinkTemp[0] == "r_cert" or listLinkTemp[0] == "r_dns_a" or listLinkTemp[0] == "r_cname"):
                nowLinksById.append(
                    [listLinkTemp[0], listLinkTemp[1], listLinkTemp[2], indexNum - 1, True])
            else:
                nowLinksById.append(
                    [listLinkTemp[0], listLinkTemp[1], listLinkTemp[2], indexNum - 1, False])
    return nowLinksById


# 筛选所有IP节点，将关联其他IP和Cert节点的IP筛选出来
def screenNode(typeName, nowPath, coreList, nowNodes):
    if(typeName == "IP"):
        nodePath = "LinksByIP/"
        fileName = "IpInfo"
        numList = 35000
    
    else:
        nodePath = "LinksByCert/"
        fileName = "certInfo"
        numList = 22000
    nodeListNum = (coreList + 1) * numList
    if((coreList + 1) * numList > len(nowNodes)):
        nodeListNum = None
    nodeInfo = []
    for i in nowNodes[coreList * numList: nodeListNum]:
        f = open(nowPath + nodePath +
                str(i[0]) + ".json", 'r', encoding='utf-8')
        ipJson = json.load(f)
        nodeDomain = 0
        industryNum = 0
        ipCert = len(ipJson["certEnd"])

        ipIp = len(ipJson["ipEnd"])
        for j in ipJson["nodes"]:
            if(j[-2] == "Domain"):
                nodeDomain += 1
                if(not j[-1] == "[]"):
                    industryNum += 1
        nodeInfo.append([i[0], ipCert, ipIp, nodeDomain, industryNum])
    with open(nowPath + nodePath + fileName + str(coreList) + ".json", 'w', encoding='utf-8') as f:
        json.dump(nodeInfo, f, ensure_ascii=False)


# 根据某一个IP获取整个链路
def getAllLinksByIp(nowPath, typeName, numId, nodeCsvW):
    if(typeName == "IP"):
        nodePath = "LinksByIP/"
    else:
        nodePath = "LinksByCert/"
    nodeLinksJ = open(nowPath + nodePath + str(numId) +
                      ".json", "r", encoding="utf-8")
    nodeLinks = json.load(nodeLinksJ)

    linksToIp = []
    linksToCert = []
    linksToWhos = []
    linksToDomain = []
    for i in nodeLinks["links"]:
        if(i[0] == "r_dns_a"):
            linksToIp.append(i)
        elif(i[0] == "r_cert"):
            linksToCert.append(i)
        elif(i[0] == "r_whois_phone" or i[0] == "r_whois_email" or i[0] == "r_whois_name"):
            linksToWhos.append(i)
        elif(i[3] > 0):
            linksToDomain.append(i)
    nodeAllLinks = [linksToIp,
                    linksToCert,
                    linksToWhos,
                    linksToDomain]
    ipToIpAndCertLinks = []

    # 获取节点到目标节点的所有路径
    for i in nodeLinks["certEnd"]:
        if(int(i[0][0]) > numId):
            ipToIpAndCertLinks.append(getLinksToTarget(numId, "Cert", i[0], nowPath,
                                                       nodeAllLinks, nodeLinks, nodeCsvW))
    for i in nodeLinks["ipEnd"]:
        if(int(i[0][0]) > numId):
            ipToIpAndCertLinks.append(getLinksToTarget(numId, "IP", i[0], nowPath,
                                                       nodeAllLinks, nodeLinks, nodeCsvW))

    if(typeName == "IP"):
        nodeSavePath = "LinksByIPScreen/"
    else:
        nodeSavePath = "LinksByCertScreen/"
    with open(nowPath + nodeSavePath + str(numId) + ".json", "w", encoding="utf-8") as f:
        json.dump(ipToIpAndCertLinks, f, ensure_ascii=False)


def getLinksToTarget(numId, typeName, i, nowPath, nodeAllLinks, nodeLinks, nodeCsvW):
    if(typeName == "IP"):
        nodePath = "LinksByIP/"
        linksList = 0
    else:
        nodePath = "LinksByCert/"
        linksList = 1
    linksToTarget = []
    nodesToTarget = []
    # 获取最终链接到该Target节点的所有Links和相关Nodes
    for j in nodeAllLinks[linksList]:
        if(j[2] == i[0]):
            linksToTarget.append(j)
            nodesToTarget.append(j[1])

 
    # 获取该Target节点的相关links
    TargetLinksJ = open(nowPath + nodePath +
                        str(i[0]) + ".json", "r", encoding="utf-8")
    TargetLinks = json.load(TargetLinksJ)["links"]

    # 获取Target节点链接当前节点的所有nodes和Links
    for j in TargetLinks:
        if(j[2] == numId):
            linksToTarget.append([j[0],j[1],j[2],3,True])
            nodesToTarget.append(j[1])
    TargetLinksJ.close()

    nodeInMiddle = []
    linksInMiddle = []
    # 获取当前nodes所在的所有Links，如果Links是跳转到域名的注册人姓名等也保存
    for j in nodeAllLinks[-1]:
        if(j[1] in nodesToTarget and j[2] in nodesToTarget):
            linksToTarget.append(j)
        if(j[3] == 2):
            if(j[1] not in nodesToTarget and j[2] in nodesToTarget):
                nodeInMiddle.append(j[1])
                linksInMiddle.append(j)
            elif(j[1] in nodesToTarget and j[2] not in nodesToTarget):
                nodeInMiddle.append(j[2])
                linksInMiddle.append(j)
        elif(j[3] == 1):
            if(j[1] in nodeInMiddle and j[2] in nodesToTarget):
                nodesToTarget.append(j[1])
                linksInMiddle.append(j)
            elif(j[1] in nodesToTarget and j[2] in nodeInMiddle):
                nodesToTarget.append(j[2])
                linksInMiddle.append(j)
    for j in nodeAllLinks[-2]:
        if(j[1] in nodesToTarget):
            linksToTarget.append(j)
            nodesToTarget.append(j[2])

    # 统计当前Links和Nodes的数量及类型
    nodeToTargetInfo = [nodeLinks["beginNode"], i]
    allDomainNodeNum = 0
    allDomainInstduryNodeNum = 0
    nodesToTarget = list(set(nodesToTarget))
    for j in nodesToTarget:
        nowNode = list(nodeCsvW[int(j) - 1])
        if(nowNode[-2] == "Domain"):
            allDomainNodeNum += 1
            if(not nowNode[-1] == "[]"):
                allDomainInstduryNodeNum += 1
        nodeToTargetInfo.append(nowNode)

    return {
        "begin": nodeLinks["beginNode"],
        "end": i,
        "nodes": nodeToTargetInfo,
        "links": linksToTarget,
        "nodeNum": len(nodesToTarget) + 2,
        "domainNum": allDomainNodeNum,
        "industryNum": allDomainInstduryNodeNum,
    }


def getAllLinksByNodes(coreList, nowPath, typeName, nodes, nodeCsvW):
    print(typeName, " : 第", coreList, "个线程开始执行了----------------",
          time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()))
    for i in nodes:
        getAllLinksByIp(nowPath, typeName, i[0], nodeCsvW)
    print(typeName, " : 第", coreList, "个线程执行完成了----------------",
          time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()))



if __name__ == '__main__':
    nowPath = "./data/"
    # 打开所有的节点
    nodeCsvW = pd.read_csv(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumId.csv", header=0)
    linkCsvW = open(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/nodeLinksJson.json", 'r', encoding='utf-8')
    linksAll = json.load(linkCsvW)
    linkCsvW.close()
    ipNode = nodeCsvW[nodeCsvW["type"] == "IP"].values
    certNode = nodeCsvW[nodeCsvW["type"] == "Cert"].values
    nodeCsvW = nodeCsvW.values
    # # 获取每个IP节点连接的IP和Cert节点
    # print("获取每个IP节点连接的IP和Cert节点---------------------------------------------")
    # pool = mp.Pool(processes=6)
    # for i in range(6):
    #     pool.apply_async(getNodesWithCretAndIp, args=(
    #         i, "IP", nowPath, nodeCsvW, linksAll, ipNode))
    #     print(i)
    # pool.close()
    # pool.join()

    # # 获取每个IP节点连接的IP节点和Cert节点数量和其对应链路的黑灰产业的Domain数量
    # print("获取每个IP节点连接的IP节点和Cert节点数量和其对应链路的黑灰产业的Domain数量-----------------")
    # pool = mp.Pool(processes=6)
    # for i in range(6):
    #     pool.apply_async(screenNode, args=("IP", nowPath, i, ipNode))
    #     print(i)
    # pool.close()
    # pool.join()

    # # 获取筛选后的所有Ip节点
    # print("获取筛选后的所有Ip节点----------------------------------------------")
    # AllIp = []
    # IpInCert = []
    # for i in range(6):
    #     nowIpJ = open(nowPath + "LinksByIP/IpInfo" +
    #                   str(i) + ".json", "r", encoding='utf-8')
    #     nowIp = json.load(nowIpJ)
    #     for i in nowIp:
    #         AllIp.append(list(i))
    #         if((i[1] > 0 or i[2] > 0) and i[4] > 0):
    #             IpInCert.append(list(i))
    # with open(nowPath + "LinksByIP/IpInfo.json", 'w', encoding='utf-8') as f:
    #     json.dump(AllIp, f, ensure_ascii=False)
    # with open(nowPath + "LinksByIP/IpScreen.json", 'w', encoding='utf-8') as f:
    #     json.dump(IpInCert, f, ensure_ascii=False)
    # with open(nowPath + "LinksByIP/IpInfo.json", 'r', encoding='utf-8') as f:
    #     AllIp = json.load(f)
    #     AllIp.sort(reverse = True, key=lambda x: x[-1])
    #     f2 = open(nowPath + "LinksByIP/IpInfoSort.json", 'w', encoding='utf-8')
    #     json.dump(AllIp, f2, ensure_ascii= False)


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
    # print("获取每个Cert节点连接的IP节点和Cert节点数量和其对应链路的黑灰产业的Domain数量--------------------------")
    # pool = mp.Pool(processes=6)
    # for i in range(6):
    #     pool.apply_async(screenNode, args=("Cert", nowPath, i, certNode))
    #     print(i)
    # pool.close()
    # pool.join()

    # # 获取筛选后的所有Cert节点
    # print("获取筛选后的所有Cert节点----------------------------------------------")
    # AllIp = []
    # IpInCert = []
    # for i in range(6):
    #     nowIpJ = open(nowPath + "LinksByCert/certInfo" +
    #                   str(i) + ".json", "r", encoding='utf-8')
    #     nowIp = json.load(nowIpJ)
    #     for i in nowIp:
    #         AllIp.append(list(i))
    #         if((i[1] > 0 or i[2] > 0) and i[4] > 0):
    #             IpInCert.append(list(i))
    # with open(nowPath + "LinksByCert/certInfo.json", 'w', encoding='utf-8') as f:
    #     json.dump(AllIp, f, ensure_ascii=False)
    # with open(nowPath + "LinksByCert/certScreen.json", 'w', encoding='utf-8') as f:
    #     json.dump(IpInCert, f, ensure_ascii=False)
    # with open(nowPath + "LinksByCert/certInfo.json", 'r', encoding='utf-8') as f:
    #     AllCert = json.load(f)
    #     AllCert.sort(reverse = True, key=lambda x: x[-1])
    #     f2 = open(nowPath + "LinksByCert/certInfoSort.json", 'w', encoding='utf-8')
    #     json.dump(AllCert, f2, ensure_ascii= False)


    # 获取筛选后的所有Ip节点与其他节点的路径
    print("获取筛选后的所有Ip节点与其他节点的路径----------------------------------------------")
    with open(nowPath + "LinksByIP/IpScreen.json", 'r', encoding='utf-8') as f:
        IpScreen = json.load(f)
        dataLen = int(len(IpScreen) / 3)
        IpScreen = IpScreen[: dataLen]
        useIpScreen = []
        for i in IpScreen: 
            # if(not os.path.exists(nowPath + "LinksByIPScreen/" + str(i[0]) + ".json")):
            if(i[0] == 99246):
                useIpScreen.append(i)
        print(useIpScreen)
        
        getAllLinksByNodes(0, nowPath, "IP", useIpScreen, nodeCsvW)
        # dataLen = int(len(useIpScreen))
        # pool = mp.Pool(processes=12)
        # num = 0
        # print(len(useIpScreen))
        # numLen =  ceil(dataLen / 12)
        # for i in range(12):
        #     nodeListNum = (i + 1) * numLen
        #     if(i == 11):
        #         nodeListNum = None
        #     pool.apply_async(getAllLinksByNodes, args=(
        #         i, nowPath, "IP", useIpScreen[i * numLen: nodeListNum], nodeCsvW))
        #     print(i, i + 1, i * numLen, nodeListNum)
        # pool.close()
        # pool.join()

    # # 获取筛选后的所有Cert节点与其他节点的路径
    # print("获取筛选后的所有Cert节点与其他节点的路径----------------------------------------------")
    # with open(nowPath + "LinksByCert/certScreen.json", 'r', encoding='utf-8') as f:
    #     certScreen = json.load(f)
    #     pool = mp.Pool(processes=12)
    #     print(len(IpScreen))
    #     dataLen = int(len(certScreen) / 3)
    #     certScreen = certScreen[: dataLen]
    #     print(len(certScreen))
    #     pool = mp.Pool(processes=12)
    #     numLen =  ceil(dataLen/ 12)
    #     for i in range(12):
    #         nodeListNum = (i + 1) * numLen
    #         if(i == 11):
    #             nodeListNum = None
    #         pool.apply_async(getAllLinksByNodes, args=(
    #             i, nowPath, "Cert", certScreen[i * numLen: nodeListNum], nodeCsvW))
    #         print(i, i + 1, i * numLen, nodeListNum)
    #     pool.close()
    #     pool.join()

