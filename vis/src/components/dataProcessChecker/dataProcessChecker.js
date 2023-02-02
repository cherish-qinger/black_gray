// 数据请求
import {
  getInitialSds,
  getIcClueData2Sds,
  getSkeletonChartDataSds,
  getMainChartSds,
  getDifChartSds,
  getGroupAllInfoSds
//   getInfoListSds,
//   getBulletChartDataSds,
//   getDetialListSds,
//   getIndustryStackSds,
//   getFinalDataSds,
//   getIdentifyICNodesSds

} from "../../apis/api.js";
import { useEffect, useState } from "react";

export default function DataProcessChecker() {

  // //请求数据
  // useEffect(() => {
  //   getInitialSds().then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  // useEffect(() => {
  //   getIcClueData2Sds(385418, "Cert").then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  // useEffect(() => {
  //   getSkeletonChartDataSds(["3", "4", "101", "102", "112", "289","35959","5719"]).then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  // useEffect(() => {
  //   getMainChartSds(linksInfo).then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  // useEffect(() => {
  //   getDifChartSds(nodesLinksInfo).then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  // useEffect(() => {
  //   getInfoListSds(nodesLinksInfo).then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  // useEffect(() => {
  //   getBulletChartDataSds(nodesLinksInfo).then((res) => {
  //     console.log(res)
  //   }, [])
  // })

  // useEffect(() => {
  //   getDetialListSds(nodesLinksInfo).then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  //   useEffect(() => {
  //     getIndustryStackSds(nodesLinksInfo).then((res) => {
  //     console.log(res)
  //   });
  // }, [])

  // useEffect(() => {
  //   getFinalDataSds(nodesLinksInfo).then((res) => {
  //     console.log(res)
  //   });
  // }, [])
  
//   useEffect(() => {
//     getIdentifyICNodesSds(nodesLinksInfo).then((res) => {
//       console.log(res)
//     });
//   }, [])
}
