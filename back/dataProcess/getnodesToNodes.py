import json
import pandas as pd
import multiprocessing as mp
import time
from alive_progress import alive_bar

def getNodesNeighbourInfop(coreList, nowPath, typeName, nodes):
    print(typeName, " : 第", coreList, "个线程开始执行了----------------",
          time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()))
    if(typeName == "IP"):
        nodePath = "LinksByIPScreen/"
    else:
        nodePath = "LinksByCertScreen/"
    allLinksToNodes = []
    for i in nodes:
        nodeLinksJ = open(nowPath + nodePath + str(i[0]) +
                        ".json", "r", encoding="utf-8")
        nodeLinks = json.load(nodeLinksJ)
        nodesToNodesInfo = []
        for j in nodeLinks:
            nodesToNodesInfo.append([j["begin"][0], j["end"][0], j["nodeNum"], j["domainNum"], j["industryNum"]])
        
            # 补全每个文件中的内容
            nowNodeFile = "LinksByIPScreen/"
            if(j["end"][3] == "Cert"):
                nowNodeFile = "LinksByCertScreen/"
            with open(nowPath + nowNodeFile + str( j["end"][0]) + ".json", "r", encoding="utf-8") as f:
                nowNodeInfo = json.load(f)
                nowNodeInfo.append(j) 
                with open(nowPath + nowNodeFile + str( j["end"][0]) + ".json", "w", encoding="utf-8") as f2:
                    json.dump(nowNodeInfo, f2, ensure_ascii=False)


        allLinksToNodes.append({
            "numId": i[0],
            "linksToNodesInfo":nodesToNodesInfo
        })
    with open(nowPath + nodePath + "linksToNode" + str(coreList) + ".json", "w", encoding="utf-8") as f:
        json.dump(allLinksToNodes, f, ensure_ascii=False)

    print(typeName, " : 第", coreList, "个线程执行完成了----------------",
          time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()))


def mergeNodesNeighbourInfop():
    nodeToNodeInfo = []
    for i in range(12):
        nowIpJ = open(nowPath + "LinksByIPScreen/linksToNode" +
                      str(i) + ".json", "r", encoding='utf-8')
        nowIp = json.load(nowIpJ)     
        nodeToNodeInfo.extend(nowIp)
        nowCertJ = open(nowPath + "LinksByCertScreen/linksToNode" +
                      str(i) + ".json", "r", encoding='utf-8')
        nowCert = json.load(nowCertJ)
        nodeToNodeInfo.extend(nowCert)
    nodeToNodeInfo.sort(key=lambda x: x["numId"])
    nodeList = []
    for i in nodeToNodeInfo:
        nodeList.append(i["numId"])
    
    nodeToNodesScreen = []
    
    with alive_bar(len(nodeToNodeInfo)) as bar:
        for i in nodeToNodeInfo:
            nodeToNodeNow = {
            "numId": i["numId"],
            "linksToNodesInfo": []
            }
            for j in i["linksToNodesInfo"]:
                if(j[-1] > 0):
                    nodeToNodeNow["linksToNodesInfo"].append(j)
            if(len(nodeToNodeNow["linksToNodesInfo"]) > 0):
                nodeToNodesScreen.append(nodeToNodeNow)
            bar()       

    with open(nowPath + "nodesToNodes.json", 'w', encoding='utf-8') as f:
        json.dump(nodeToNodeInfo, f, ensure_ascii=False)
    with open(nowPath + "nodesToNodesScreen.json", 'w', encoding='utf-8') as f:
        json.dump(nodeToNodesScreen, f, ensure_ascii=False)


if __name__ == '__main__':
    nowPath = "./data/"
    with open(nowPath + "LinksByIP/IpScreen.json", 'r', encoding='utf-8') as f:
        print("查找每一个Ip到Nodes的节点信息--------------------------------------")
        IpScreen = json.load(f)
        print(len(IpScreen))
        pool = mp.Pool(processes=12)
        numLen = int(len(IpScreen) / 12)
        # getNodesNeighbourInfop(3, nowPath, "IP", IpScreen[3 * numLen: 4 * numLen])
        for i in range(12):         
            nodeListNum = (i + 1) * numLen
            if(i == 11):
                nodeListNum = None
            pool.apply_async(getNodesNeighbourInfop, args=(
                i, nowPath, "IP", IpScreen[i * numLen: nodeListNum]))
            print(i, i + 1, i * numLen, nodeListNum)
        pool.close()
        pool.join()

    with open(nowPath + "LinksByCert/certScreen.json", 'r', encoding='utf-8') as f:
        print("查找每一个Cert到Nodes的节点信息--------------------------------------")
        certScreen = json.load(f)
        print(len(certScreen))
        pool = mp.Pool(processes=12)
        numLen = int(len(certScreen) / 12)
        for i in range(12):
            nodeListNum = (i + 1) * numLen
            if(i == 11):
                nodeListNum = None
            pool.apply_async(getNodesNeighbourInfop, args=(
                i, nowPath, "Cert", certScreen[i * numLen: nodeListNum]))
            print(i, i + 1, i * numLen, nodeListNum)
        pool.close()
        pool.join()
    # 将所有数据进行合并
    print("将所有数据进行合并----------------------------------------------")
    mergeNodesNeighbourInfop()
