import json
import pandas as pd
from alive_progress import alive_bar
import ast
import networkx as nx
import csv


def getNodeLinks(filterNode, nowPath, nowIndustryJsonAlone, nowIndustryJson):
    links = []
    with alive_bar(len(filterNode)) as bar:
        for i in filterNode:
            try:
                nowNodeLinksInfoJ = open(
                    nowPath + "LinksByIPScreen/" + str(i["numId"]) + ".json", "r", encoding="utf-8")
            except:
                nowNodeLinksInfoJ = open(
                    nowPath + "LinksByCertScreen/" + str(i["numId"]) + ".json", "r", encoding="utf-8")
            # 获取当前节点连接的Industry的所有原属性和分离后单独属性
            nowNodeLinksInfo = json.load(nowNodeLinksInfoJ)
            try:
                nowNodeIndustryJsonAlone = set(nowIndustryJsonAlone[str(i["numId"])][0])
                nowNodeIndustryJson = set(nowIndustryJson[str(i["numId"])][0])
            except:
                nowNodeIndustryJsonAlone = set([])
                nowNodeIndustryJson = set([])

            for j in i["linksToNodesInfo"]:
                if(j[0] > j[1]):
                    continue
                # 获取next节点连接的Industry的所有原属性和分离后单独属性
                try:
                    nextNodeIndustryJsonAlone = set(nowIndustryJsonAlone[str(j[1])][0])
                    nextNodeIndustryJson = set(nowIndustryJson[str(j[1])][0])
                except:
                    nextNodeIndustryJsonAlone = set([])
                    nextNodeIndustryJson = set([])
                if(getNodesdirection(nowNodeLinksInfo, j[0], j[1], nowNodeIndustryJsonAlone, nowNodeIndustryJson, nextNodeIndustryJsonAlone, nextNodeIndustryJson)):
                    links.append([j[0], j[1]])
            bar()
        with open(nowPath + "nodeLinksInfo3.json", "w", encoding= "utf-8") as f:
            json.dump(links,f,ensure_ascii=False)     


def getNodesdirection(nowNodeLinksInfo, beginNodeNumId, endNodeNumId,  nowNodeIndustryJsonAlone, nowNodeIndustryJson, nextNodeIndustryJsonAlone, nextNodeIndustryJson):
    for i in nowNodeLinksInfo:
        if(i["end"][0] == endNodeNumId):
            endNodes = []
            endIndustry = []
            endIndustryAlone = []
            beginNodes = []
            beginIndustry = []
            beginIndustryAlone = []
            linksRelation = []
            for j in i["links"]:
                if(int(j[2]) == endNodeNumId):
                    if(j[3] == 2):
                        linksRelation.append(0)
                    endNodes.append(int(j[1]))
                if(int(j[2]) == beginNodeNumId):
                    beginNodes.append(int(j[1]))
            # 获取当前链路中，next节点连接的Industry的所有原属性和分离后单独属性
            for j in endNodes:
                endIndustry.append(nodeCsvW[j - 1][-1])
                endIndustryAlone.extend(ast.literal_eval(nodeCsvW[j - 1][-1]))
            endIndustry = set(endIndustry)
            endIndustry.discard("[]")
            endIndustryAlone = set(endIndustryAlone)

            # 获取当前链路中，当前节点连接的Industry的所有原属性和分离后单独属性
            for j in beginNodes:
                beginIndustry.append(nodeCsvW[j - 1][-1])
                beginIndustryAlone.extend(
                    ast.literal_eval(nodeCsvW[j - 1][-1]))
            beginIndustry = set(beginIndustry)
            beginIndustry.discard("[]")
            beginIndustryAlone = set(beginIndustryAlone)

            togetherNodes = set(beginNodes)&set(endNodes)
            endNodes = list(set(endNodes).difference(togetherNodes))
            beginNodes = list(set(beginNodes).difference(togetherNodes))

            # 判断当前节点和next节点连接的方式：subdomain 或者 request_jump连接
            for j in i["links"]:
                if(j[0] == "r_subdomain"):
                    if(int(j[1]) in beginNodes or int(j[2]) in endNodes):
                        linksRelation.append(1)
                    if(int(j[1]) in endNodes and int(j[2]) in beginNodes):
                        linksRelation.append(2)
                if(j[0] == "r_request_jump"):
                    if(int(j[1]) in endNodes and int(j[2]) in beginNodes):
                        linksRelation.append(3)
                    if(int(j[1]) in beginNodes and int(j[2]) in endNodes):
                        linksRelation.append(4)
            linksRelation = list(set(linksRelation))
            isLinks = True
            # 判断当前节点的industry和next的industry的关系
            for j in linksRelation:
                if(not isLinks):
                    break
                # 两个节点通过subdomain连接：源节点要包含目标节点的所有industry
                if(j == 0):
                    if(len(nextNodeIndustryJson.difference(endIndustry)) > 0
                            and len(nowNodeIndustryJson.difference(beginIndustry)) > 0):
                        isLinks = False
                if(j == 1 or j == 4):
                    if(not (len(endIndustryAlone.difference(beginIndustryAlone)) == 0
                            and len(nextNodeIndustryJson.difference(endIndustry))== 0
                            and len(nextNodeIndustryJsonAlone.difference(beginIndustryAlone)) == 0)):
                        isLinks = False
                if(j == 2 or j == 3):
                    if(not (len(beginIndustryAlone.difference(endIndustryAlone)) == 0
                            and len(nowNodeIndustryJson.difference(beginIndustry)) == 0
                            and len(nowNodeIndustryJsonAlone.difference(endIndustryAlone)) == 0)):
                        isLinks = False
            return isLinks


if __name__ == '__main__':
    nowPath = "./data/"
    # 打开所有的节点
    nodeCsvW = pd.read_csv(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumId.csv", header=0)
    # linkCsvW = open(
    #     nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/nodeLinksJson.json", 'r', encoding='utf-8')
    # linksAll = json.load(linkCsvW)
    # linkCsvW.close()
    # ipNode = nodeCsvW[nodeCsvW["type"] == "IP"].values
    # certNode = nodeCsvW[nodeCsvW["type"] == "Cert"].values
    nodeCsvW = nodeCsvW.values

    # filterNodeJ = open(
    #     nowPath + "nodesToNodes.json", 'r', encoding='utf-8')
    # filterNode = json.load(filterNodeJ)
    # with open(nowPath + "nodeIndustryInfo.json", "r", encoding="utf-8") as f:
    #     nowIndustryJsonAlone = json.load(f)
    #     with open(nowPath + "nodeIndustryInfo1.json", "r", encoding="utf-8") as f2:
    #         nowIndustryJson = json.load(f2)
    #         getNodeLinks(filterNode, nowPath,
    #                      nowIndustryJsonAlone, nowIndustryJson)
    # with open(nowPath + "nodeLinksInfo3.json", "r", encoding= "utf-8") as f:
    #     links = json.load(f)
    #     g=nx.Graph()
    #     community = []
    #     for i in filterNode:
    #         g.add_node(i["numId"])
    #     g.add_edges_from(links)
    #     for c in nx.connected_components(g):
    #         a = list(c)
    #         a.sort()
    #         community.append(a)
    #     community.sort(reverse=True, key=lambda x:len(x))
    #     communityLen = []
    #     for i in community:
    #         communityLen.append(len(i))
    #     with open(nowPath + "nodeIndustryCommunity3.json", "w", encoding= "utf-8") as f2:
    #         json.dump(community,f2)
    #     with open(nowPath + "nodeIndustryCommunityLen3.json", "w", encoding= "utf-8") as f2:
    #         json.dump(communityLen,f2)
    

    # filterNodeJ = open(
    #     nowPath + "nodesToNodes.json", 'r', encoding='utf-8')
    # filterNode = json.load(filterNodeJ)
    # filterNodeC = open(nowPath + "filterNode3.csv", 'w', encoding='utf-8', newline="")
    # filterNodeW = csv.writer(filterNodeC)
    # filterNodeW.writerow(["numId","id","name","type","industry"])
        
    # with alive_bar(len(filterNode)) as bar:
    #     for i in filterNode:
    #         nowNode = list(nodeCsvW[i["numId"] - 1])
    #         filterNodeW.writerow(nowNode)
    #         bar()
    # filterNodeC.close()


    # filterNodesId = []
    # for i in filterNode:
    #     filterNodesId.append(i["numId"])
    # filterLinksJ = open(nowPath + "nodeLinksInfo3.json", "r", encoding= "utf-8")
    # filterLinks = json.load(filterLinksJ)
    # filterLinksC = open(nowPath + "filterLinks3.csv", 'w', encoding='utf-8', newline="")
    # filterLinksW = csv.writer(filterLinksC)
    # filterLinksW.writerow(["soucer","target"])
    
    # with alive_bar(len(filterLinks)) as bar:
    #     for i in filterLinks:
    #         if(i[1] in filterNodesId):
    #             filterLinksW.writerow(i)
    #         bar()
    # filterLinksC.close()
    
    linksCsvW = pd.read_csv(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/LinkNumId.csv", header=0)
    linksCsvW = linksCsvW.values
    links1 = []
    links2 = []
    links3 = []
    links4 = []
    with alive_bar(len(linksCsvW)) as bar:
        for i in linksCsvW:
            if(i[0] == "r_subdomain" or i[0] == "r_request_jump"):
                node1 = list(nodeCsvW[i[1] -1])
                node2= list(nodeCsvW[i[2] - 1])
                i = list(i)
                if(node1[-1] == "[]" and node2[-1] == "[]"):
                    links1.append([i, node1, node2])
                if(node1[-1] != "[]" and node2[-1] == "[]"):
                    links2.append([i, node1, node2])
                if(node1[-1] == "[]" and node2[-1] != "[]"):
                    links3.append([i, node1, node2])
                if(node1[-1] != "[]" and node2[-1] != "[]"):
                    links4.append([i, node1, node2])
            bar()
    print(1)
