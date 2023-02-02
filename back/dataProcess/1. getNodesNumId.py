import ast
from copy import deepcopy
import csv
import json
from math import fabs
from operator import truediv
from os import link
import os
from re import T, X
import sys
from typing import Set
from alive_progress import alive_bar
import multiprocessing as mp
import numpy as np
import pandas as pd
sys.setrecursionlimit(100000)


# 将node 以numId的方式查找，顺序查找加快速度
def addNodeId():
    # 将node节点设置一个numId 以便查找。
    NodeCsv = open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/Node.csv",
                   'r', encoding="utf-8", newline='')
    next(NodeCsv)
    NodeCsvReader = csv.reader(NodeCsv)
    numId = 0
    nodeList = []
    NodeCsvW = open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumId.csv",
                    'w+', encoding="utf-8", newline='')
    NodeCsvWrite = csv.writer(NodeCsvW)
    NodeCsvWrite.writerow(["numId", "id", "name", "type", "industry"])

    # 将每个node设置一个numId 以便后续进行查找
    with alive_bar(2371558) as bar:
        for i in NodeCsvReader:
            numId += 1
            i.insert(0, numId)
            nodeList.append(i[1])
            NodeCsvWrite.writerow(i)
            bar()
    NodeCsvW.close()
    nodeList.reverse()

    # 存储所有的link数据
    LinkCsv = open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/Link.csv",
                   'r', encoding="utf-8", newline='')
    next(LinkCsv)
    LinkCsvReader = csv.reader(LinkCsv)
    linkList = []
    # 查找每一个node的numId并存储
    for i in LinkCsvReader:
        linkList.append(i)

    LinkCsvW = open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/LinkNumId.csv",
                    'w+', encoding="utf-8", newline='')
    LinkCsvWrite = csv.writer(LinkCsvW)
    LinkCsvWrite.writerow(["relation", "source", "target", "skipNum"])
    LinkCsvW.close()
    nodeIdNum = len(nodeList)

    # #最初方案
    # for i in range(33):
    #     if((i + 1) *100000 > nodeIdNum):
    #         changeLinkId(i, nodeList, linkList)
    #     else:
    #         changeLinkId(i, nodeList[nodeIdNum - ((i + 1)* 100000):], linkList)

    # 多线程操作
    # thread_pool = []
    # for i in range(38):
    #     if(i*100000 > nodeIdNum):
    #         thread_pool.append(threading.Thread(target=changeLinkId, args=[i, nodeList, linkList], name='th_' + "i"))
    #     else:
    #         thread_pool.append(threading.Thread(target=changeLinkId, args=[i, nodeList[nodeIdNum - ((i + 1)* 100000):], linkList], name='th_' + "i"))
    # for th in thread_pool:
    #     th.start()

    # 多进程操作
    num_cores = mp.cpu_count()
    for i in range(3):
        num_cores = 33 - (i*num_cores)
        print(num_cores)
        pool = mp.Pool(processes=num_cores)
        # 对每一个进程加入相应的函数
        for j in range(num_cores):
            numList = (i * 12) + j
            # 为了加快查询速率，对节点进行切割。
            nowNodeList = nodeList[nodeIdNum - ((numList + 1) * 100000):]
            if(((numList + 1) * 100000) > nodeIdNum):
                nowNodeList = nodeList
            print(numList)
            print(len(nowNodeList))
            pool.apply_async(changeLinkId, args=(
                numList, nowNodeList, linkList))
        pool.close()
        pool.join()

    # 将每个进程存储的Link数据存入一个文件夹中
    LinkCsvW = open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/LinkNumId.csv",
                    'a+', encoding="utf-8", newline='')
    LinkCsvWrite = csv.writer(LinkCsvW)

    for i in range(33):
        LinkCsvWTemp = open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/LinkNumId" + str(i) + ".csv",
                            'r', encoding="utf-8", newline='')
        LinkCsvTempReader = csv.reader(LinkCsvWTemp)
        num = 0
        with alive_bar(100000) as bar:
            for j in LinkCsvTempReader:
                num += 1
                LinkCsvWrite.writerow(j)
                bar()
        print(i, num)
        LinkCsvWTemp.close()
    LinkCsvW.close()


# 将link文件夹中的node的Id改成NumId
def changeLinkId(i, nodeList, linkList):
    nodeIdNum = len(nodeList)
    print(nodeIdNum)
    LinkCsvW = open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/LinkNumId" + str(i) + ".csv",
                    'w', encoding="utf-8", newline='')
    LinkCsvWrite = csv.writer(LinkCsvW)
    print(i)
    # 每次跑10万个数据
    nextList = (i + 1) * 100000
    if(nextList > len(linkList)):
        nextList = None
    for j in linkList[i*100000:nextList]:
        linkRelation = j[0]
        linkLength = 0
        # 根据业务规则2.1，存储其跳转次数
        if(j[0] == "r_asn" or j[0] == "r_cidr"):
            linkLength = 1
        elif(j[0] == "r_cert_chain" or j[0] == "r_cname"):
            linkLength = 2
        else:
            linkLength = 3
        # 找到其相关节点的numId
        try:
            linkSource = nodeIdNum - nodeList.index(j[1])
            linkTarget = nodeIdNum - nodeList.index(j[2])
        except:
            linkSource = j[1]
            linkTarget = j[2]
        LinkCsvWrite.writerow(
            [linkRelation, linkSource, linkTarget, linkLength])
    LinkCsvW.close()
    print(i)


if __name__ == '__main__':
    nowPath = os.path.abspath(os.path.dirname(
        os.path.dirname(__file__))) + "/data/"
    # addNodeId()
    # 打开所有的节点
    nodeCsvW = pd.read_csv(
        nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumIdNow.csv", header=0)
    
    # # 将industry进行修改，改成AB的形式
    # nodeCsvNow = []
    # for i in nodeCsvW.values:
    #     nowIndustry = ast.literal_eval(i[-1])
    #     nowIndustry.sort()
    #     strnowIndustry = ""
    #     for k in nowIndustry:
    #         strnowIndustry += k
    #     if(strnowIndustry == ""):
    #         strnowIndustry = "  "
    #     nodeCsvNow.append(np.array([i[0],i[1],i[2],i[3], strnowIndustry]))
    # nodeCsvNow = pd.DataFrame(nodeCsvNow)
    # nodeCsvNow.to_csv(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumIdNow.csv", index=None, header=["numId","id","name","type","industry"])

    industryType = set()
    for i in nodeCsvW.values:
        industryType.add(i[-1])
    industryType = list(industryType)
    industryType.sort()
    industryType.sort(key =lambda x:len(x))
    print(industryType)



    #  根据Links中的NumID 获取每一个节点关联的Links 
    # linksCsvW = pd.read_csv(
    #     nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/LinkNumId.csv", header=0)
    # nodesLinks = []
    # for i in nodeCsvW.values:
    #     nodesLinks.append([])
    # for i in linksCsvW.values:
    #     nodesLinks[i[1] - 1].append(i)
    #     nodesLinks[i[2] - 1].append(i)
    # with open(nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/nodeLinksJson.json", "w", encoding="utf-8") as f:
    #     json.dump(nodesLinks, f, ensure_ascii=False)
    

    # # 获取每一个IC节点连接的Domain的Industry信息
    # nodeCsvW = pd.read_csv(
    #     nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/NodeNumIdNow.csv", header=0)
    
    # linkCsvW = open(
    #     nowPath + "ChinaVis Data Challenge 2022-mini challenge 1-Dataset/nodeLinksJson.json", 'r', encoding='utf-8')
    # linksAll = json.load(linkCsvW)
    # linkCsvW.close()
    # ipNode = nodeCsvW[nodeCsvW["type"] == "IP"].values
    # certNode = nodeCsvW[nodeCsvW["type"] == "Cert"].values
    # nodeCsvW = nodeCsvW.values
