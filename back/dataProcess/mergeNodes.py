import ast
import json
import os
from alive_progress import alive_bar
import networkx as nx
import pandas as pd

def getNodeIndustry(nowNode, linksAll, nodeCsvW):
    with alive_bar(len(nowNode)) as bar:
        ipIndustryJson = {}
        for i in nowNode:
            ipIndustry = []
            for j in linksAll[i[0] - 1]:
                if(not nodeCsvW[j[1] - 1][-1] =="[]"):
                    nowIndustry = ast.literal_eval(nodeCsvW[j[1] - 1][-1])
                    nowIndustry.sort()
                    strnowIndustry = ""
                    for k in nowIndustry:
                        strnowIndustry += k
                    ipIndustry.append(strnowIndustry)
                    # nowIndustryList = ast.literal_eval(nowIndustry)
                    # ipIndustry.extend(nowIndustryList)
            ipIndustrySet = list(set(ipIndustry))
            ipIndustrySet.sort()
            ipIndustryNum = []
            for j in ipIndustrySet:
                ipIndustryNum.append([j, ipIndustry.count(j)])
            bar()
            if(len(ipIndustrySet) == 0):
                continue
            ipIndustryJson[str(i[0])] = ipIndustryNum

        with open(nowPath + "nodeIndustryInfo1.json", "w", encoding= "utf-8") as f:
            json.dump(ipIndustryJson,f,ensure_ascii=False)


    
def getNodeLinks(filterNode, nowPath, ipIndustryJson):  
    with alive_bar(len(filterNode)) as bar:
        links = []
        for i in filterNode:
            # nowNodeLinksInfoJ = open(nowPath + "allScreenNodes/" + str(i["numId"]) + ".json", "r", encoding= "utf-8")
            # nowNodeLinksInfo = json.load(nowNodeLinksInfoJ)
            try:
                maxIndex = ipIndustryJson[str(i["numId"])][1].index(max(ipIndustryJson[str(i["numId"])][1]))
                nowIpIndustry = ipIndustryJson[str(i["numId"])][0][maxIndex]
            except:    
                bar()
                continue
            for j in i["linksToNodesInfo"]:
                if(j[0] > j[1]):
                    continue
                try:                
                    maxIndex = ipIndustryJson[str(j[1])][1].index(max(ipIndustryJson[str(j[1])][1]))
                    nextIpIndustry = ipIndustryJson[str(j[1])][0][maxIndex]
                except:
                    continue
                if(nowIpIndustry == nextIpIndustry):
                    links.append([j[0],j[1]])

                # else:
                #     if(len(set(nowIpIndustry).difference(set(nextIpIndustry))) > 0 and len(set(nextIpIndustry).difference(set(nowIpIndustry))) > 0):
                #         continue
                #     # 当前节点的黑灰产业相关节点不存在
                #     elif(len(set(nowIpIndustry).difference(set(nextIpIndustry))) > 0):
                #        if(getLinksIndustry(nowNodeLinksInfo,j[0], j[1], j[1])):
                #             links.append([j[0],j[1]])

                #     elif(len(set(nextIpIndustry).difference(set(nowIpIndustry))) > 0):
                #         if(getLinksIndustry(nowNodeLinksInfo,j[1], j[0], j[1])):
                #             links.append([j[1],j[0]])
            bar()
        with open(nowPath + "nodeLinksInfo2.json", "w", encoding= "utf-8") as f:
            json.dump(links,f,ensure_ascii=False)


def getLinksIndustry(nowNodeLinksInfo,beginNodeNumId, endNodeNumId, useNumId):
    for i in nowNodeLinksInfo:
        if(i["end"][0] == useNumId):
            endNodes = []
            endIndustry = []
            beginNodes = []
            beginIndustry = []
            for j in i["links"]:
                if(int(j[2]) == endNodeNumId):
                    endNodes.append(int(j[1]))
                if(int(j[2]) == beginNodeNumId):
                    beginNodes.append(int(j[1]))

            for j in endNodes:
                # endIndustry.append(nodeCsvW[j - 1][-1])
                endIndustry.extend(ast.literal_eval(nodeCsvW[j - 1][-1]))
            endIndustry = set(endIndustry)
            for j in beginNodes:
                # beginIndustry.append(nodeCsvW[j - 1][-1])
                beginIndustry.extend(ast.literal_eval(nodeCsvW[j - 1][-1]))
            beginIndustry = set(beginIndustry)
            isBegin = False
            isEnd = False
            for j in i["links"]:
                if(j[0] == "r_subdomain"):
                    if(j[1] in endNodes and j[2] in beginNodes):
                        isEnd = True
                    if(j[1] in beginNodes and j[2] in endNodes):
                        isBegin = True
                        
            if(isBegin):
                if(len(endIndustry.difference(beginIndustry)) == 0):
                    return True
            elif(isEnd):
                return False
            else:
                return True
            break
    return False


def getIpAndCertLinks(filterNode, ipIndustryJson, nowPath, nodeCsvW):
    with alive_bar(len(filterNode)) as bar:
        for i in filterNode:
            bar()
            try:
                nowNodeLinksInfoJ = open(nowPath + "LinksByIPScreen/" + str(i["numId"]) + ".json", "r", encoding= "utf-8")
            except:
                nowNodeLinksInfoJ = open(nowPath + "LinksByCertScreen/" + str(i["numId"]) + ".json", "r", encoding= "utf-8")
            nowNodeLinksInfo = json.load(nowNodeLinksInfoJ)
            for j in i["linksToNodesInfo"]:
                if(j[0] > j[1]):
                    continue
                for k in nowNodeLinksInfo:
                    if(k["end"][0] == j[1]):
                        for l in k["links"]:
                            # if(int(l[2]) == j[1] and l[3] == 2):
                            #     if(not nodeCsvW[int(l[1]) -1][-1] == "[]"):
                            #         links.append([j[0],j[1]])
                             if(l[0] == "r_subdomain" or l[0] == "r_request_jump"):
                                links.append([j[0],j[1]])
                                break
        with open(nowPath + "nodeLinksByDomian_Domian.json", "w", encoding= "utf-8") as f:
        # with open(nowPath + "nodeLinksByOneDomain.json", "w", encoding= "utf-8") as f:
            json.dump(links,f,ensure_ascii=False)

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

    # try:
    #     os.makedirs(nowPath + "nodeIndustryInfo")
    # except:
    #     print("文件夹已存在")    
    # filterNode = []
    # for i in ipNode:
    #     filterNode.append(i)
    # for i in certNode:
    #     filterNode.append(i)

    # getNodeIndustry(filterNode, linksAll, nodeCsvW)
    filterNodeJ =  open(
        nowPath + "nodesToNodes.json", 'r', encoding='utf-8')
    filterNode = json.load(filterNodeJ)
    with open(nowPath + "nodeIndustryInfo1.json", "r", encoding= "utf-8") as f:
        ipIndustryJson = json.load(f)
        # getNodeLinks(filterNode, nowPath, ipIndustryJson)
        getIpAndCertLinks(filterNode, ipIndustryJson, nowPath, nodeCsvW)


    with open(nowPath + "nodeLinksByDomian_Domian.json", "r", encoding= "utf-8") as f:
        links = json.load(f)
        g=nx.Graph()
        community = []
        for i in filterNode:
            g.add_node(i["numId"])
        g.add_edges_from(links)
        for c in nx.connected_components(g):
            a = list(c)
            a.sort()
            community.append(a)
        community.sort(reverse=True, key=lambda x:len(x))
        communityLen = []
        for i in community:
            communityLen.append(len(i))
        with open(nowPath + "nodeIndustryDomian_DomianCommunity.json", "w", encoding= "utf-8") as f2:
            json.dump(community,f2)
        with open(nowPath + "nodeIndustryDomian_DomianCommunityLen.json", "w", encoding= "utf-8") as f2:
            json.dump(communityLen,f2)

    # try:
    #     os.makedirs(nowPath + "NodeAlone")
    # except:
    #     print("文件夹已存在")
    # # 获取筛选后的所有Ip节点
    # print("获取筛选后的所有Ip节点----------------------------------------------")
    # AllIp = []
    # IpInCert = []
    # nowIpJ = open(nowPath + "LinksByIP/IpInfo.json", "r", encoding='utf-8')
    # nowIp = json.load(nowIpJ)
    # for i in nowIp:
    #     if(i[1] ==0 and i[2] == 0 and i[4] > 0):
    #         IpInCert.append(i)          
    #         nowIpJ = open(nowPath + "LinksByIP/" + str(i[0]) + ".json", "r", encoding='utf-8')
    #         IpInfo = json.load(nowIpJ)
    #         nIpInfoJ = open(nowPath + "NodeAlone/" + str(i[0]) + ".json", "w", encoding='utf-8')
    #         json.dump(IpInfo, nIpInfoJ,ensure_ascii= False)
    # IpInCert.sort(key=lambda x: x[3])
    # nowIpJ = open(nowPath + "LinksByIP/IpInfoNone.json", "w", encoding='utf-8')
    # json.dump(IpInCert, nowIpJ,ensure_ascii= False)

    # # 获取筛选后的所有Ip节点
    # print("获取筛选后的所有Ip节点----------------------------------------------")
    # AllIp = []
    # IpInCert = []
    # nowIpJ = open(nowPath + "LinksByCert/certInfo.json", "r", encoding='utf-8')
    # nowIp = json.load(nowIpJ)
    # for i in nowIp:
    #     if(i[1] == 0 and i[2] == 0 and i[4] > 0):
    #         IpInCert.append(i)            
    #         nowIpJ = open(nowPath + "LinksByCert/" + str(i[0]) + ".json", "r", encoding='utf-8')
    #         IpInfo = json.load(nowIpJ)
    #         nIpInfoJ = open(nowPath + "NodeAlone/" + str(i[0]) + ".json", "w", encoding='utf-8')
    #         json.dump(IpInfo, nIpInfoJ,ensure_ascii= False)
    # IpInCert.sort(key=lambda x: x[3])
    # nowIpJ = open(nowPath + "LinksByCert/certInfoNone.json", "w", encoding='utf-8')
    # json.dump(IpInCert, nowIpJ,ensure_ascii= False)
    
    