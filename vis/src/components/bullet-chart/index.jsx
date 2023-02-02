import bullet from "./bullet";
import "./index.css";
import * as d3 from "d3";
import PubSub from "pubsub-js";

// import { getBulletChartDataSds } from "../../apis/api";
import { useEffect, useState } from "react";

export default function BulletChart({ w, h, divname, dataparam }) {
  const [data, setData] = useState([]);
  const [dataRange, setDataRange] = useState({ minNum: 0, maxNum: 0 });

  const [svgWidth, setSvgWidth] = useState(w);
  const [svgHeight, setSvgHeight] = useState(h);

  // 随系统缩放修改画布大小
  useEffect(() => {
    setSvgWidth(w);
  }, [w]);
  useEffect(() => {
    setSvgHeight(h);
  }, [h]);

  useEffect(() => {
    if (dataparam.length == 0) return;
    console.log(dataparam);
    if (divname === "combine-table-bc-node") {
      let nodeDt = dataparam[1]; // nodes
      // 计算数据中measures和markers共同的最大、最小值 用于画图比例尺映射
      let allNumInData = [];
      nodeDt.forEach((item, index) => {
        allNumInData.push(...item["measures"], ...item["markers"]);
      });
      setData(nodeDt);
      // 设置数据 + 记录最大、最小值
      setDataRange({
        minNum: Math.min(...allNumInData),
        maxNum: Math.max(...allNumInData),
      });
    } else if (divname === "combine-table-bc-link") {
      let linkDt = dataparam[0]; // links

      // 计算数据中measures和markers共同的最大、最小值 用于画图比例尺映射
      let allNumInData = [];
      linkDt.forEach((item, index) => {
        allNumInData.push(...item["measures"], ...item["markers"]);
      });
      setData(linkDt);
      // 设置数据 + 记录最大、最小值
      setDataRange({
        minNum: Math.min(...allNumInData),
        maxNum: Math.max(...allNumInData),
      });
    }
  }, [dataparam]);

  useEffect(() => {
    const dimensions = {
      width: svgWidth,
      height: svgHeight,
      margin: { top: 10, right: 5, bottom: 60, left: 5 },
    };
    const boundedWidth =
      dimensions.width - dimensions.margin.left - dimensions.margin.right;
    const boundedHeight =
      dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    let chart = bullet()
      .minNum(dataRange["minNum"])
      .maxNum(dataRange["maxNum"])
      .height(boundedHeight)
      .width((boundedWidth / data.length) * 0.9);

    d3.selectAll(`div#${divname} svg`).remove();

    const svg = d3
      .select(`#${divname}`)
      .append("svg")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height * 0.99)
      .attr("viewBox", [0, 0, dimensions.width, dimensions.height])
      .style("max-width", "100%")
      .style("background", "#fff");

    const bounds = svg
      .append("g")
      .attr("width", boundedWidth)
      .attr("height", boundedHeight)
      .style(
        "transform",
        `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
      );

    bounds
      .selectAll("g")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "bullet")
      .attr("width", boundedWidth / data.length)
      .attr("height", boundedHeight)
      .style(
        "transform",
        (d, i) => `translate(${(boundedWidth / data.length) * i}px,0px)`
      )
      .call(chart);

    // 添加文字标识类型
    const title = bounds.append("g").style("text-anchor", "start");
    title
      .selectAll(null)
      .data(data)
      .join("text")
      .attr("class", "bullet-chart-title")
      .attr(
        "transform",
        (d, i) =>
          `translate(${(boundedWidth / data.length) * (i + 0.3)},${
            boundedHeight + 0.2 * dimensions.margin.bottom
          }) rotate(45)`
      )
      .text((d) => d.title);
  }, [data, dataRange, svgHeight, svgWidth]);

  return <></>;
}
