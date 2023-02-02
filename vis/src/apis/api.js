import { get, post } from "./http.js";


export function helloworld() {
  return get("/helloworld");
}

export function getMainChartData() {
  return get("/getMainChartData");
}

export function getIcClueData() {
  return get("/getIcClueData");
}

export function getBulletChartData() {
  return get("/getBulletChartData");
}

export function getDetailListData() {
  // TODO
  return get("/getDetailListData");
}


//孙德晟判断代码是否正确的接口

// 获取视图的初始数据：node信息改为json文件
export function getInitialSds(type, industry, id) {
  return post("/getInitialSds", {
    type: type,
    industry: industry,
    id: id,
  });
}

// 获取筛选后的IC节点的信息
export function getClueDenseDataSds() {
  return post("/getClueDenseDataSds");
}

// 获取冰柱图的数据
export function getIcClueData2Sds(numId, type) {
  return post("/getIcClueData2Sds", {
    numId: numId,
    type: type,
  });
}

// 获取IC连接图所需要的数据
export function getSkeletonChartDataSds(Nodes) {
  return post("/getSkeletonChartDataSds", {
    Nodes: Nodes,
  });
}

// 主图所需要的数据
export function getMainChartSds(linksInfo) {
  return post("/getMainChartSds", {
    linksInfo: linksInfo,
  });
}


//获取差异图的数据
export function getDifChartSds(linksInfo) {
  return post("/getDifChartSds", {
    linksInfo: linksInfo,
  });
}

// 获取该黑灰团伙的所有数据信息
export function getGroupAllInfoSds(nodesLinksInfo) {
  return post("/getGroupAllInfoSds", {
    nodesLinksInfo: nodesLinksInfo,
  });
}

// 获取关键链路信息的相关数据
export function getCrutialpathData(dataparam) {
  return post("/getCrutialpathData", {
    startNode: dataparam.startNode,
    endNode: dataparam.endNode
  });
}

export function getClearData() {
  return post("/getClearData");
}

// export function getIcClueDataSds(numId, type) {
//   return post("/getIcClueDataSds", {
//     numId: numId,
//     type: type,
//   });
// }



// export function getBulletChartDataSds(nodesLinksInfo) {
//   return post("/getBulletChartDataSds", {
//     nodesLinksInfo: nodesLinksInfo,
//   });
// }

// export function getInfoListSds(nodesLinksInfo) {
//   return post("/getInfoListSds", {
//     nodesLinksInfo: nodesLinksInfo,
//   });
// }

// export function getFinalDataSds(nodesLinksInfo) {
//   return post("/getFinalDataSds", {
//     nodesLinksInfo: nodesLinksInfo,
//   });
// }

// export function getDetialListSds(nodesLinksInfo) {
//   return post("/getDetialListSds", {
//     nodesLinksInfo: nodesLinksInfo,
//   });
// }





// export function getIndustryStackSds(nodesLinksInfo) {
//   return post("/getIndustryStackSds", {
//     nodesLinksInfo: nodesLinksInfo,
//   });
// }

// export function getIdentifyData() {
//   return post("/getIdentifyData");
// }




