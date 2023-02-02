import { useState } from "react";
import { useEffect } from "react";
import Icicle from "./icicle.js";
import PubSub from "pubsub-js";
import { Button } from "antd";
import * as d3 from "d3";
import "./index.css";

// 数据请求
import { getIcClueData2Sds } from "../../apis/api.js";

var icicleChart;
var prevSelected = [];
export default function ICClueChart({ w, h }) {
  const [svgWidth, setSvgWidth] = useState(w);
  const [svgHeight, setSvgHeight] = useState(h);
  const [data, setData] = useState(undefined);
  const [dataParam, setDataParam] = useState("");
  const [selectedIclcleNode, setSelectedIclcleNode] = useState([]);
  const [selectedIclcleNodeFirst, setSelectedIclcleNodeFirst] = useState(true);

  // cluedense点击后更新冰柱图
  PubSub.unsubscribe("getClueFromDense");
  PubSub.subscribe("getClueFromDense", (msg, clue) => {
    if (clue.numId === -1) {
      setData({}); // 清空丑丑图的数据
      setSelectedIclcleNode([]); // 清空丑丑图中选择的数据
      prevSelected = [];
      icicleChart.setSelectedIcicleNode();
      return;
    }
    getIcClueData2Sds(clue.numId, clue.Id).then((res) => {
      setData(res);
    });
  });
  // 监听选择的节点的变化，如果
  useEffect(() => {
    if (!selectedIclcleNodeFirst) {
      PubSub.publish("icicleSelect", selectedIclcleNode);
    }
    setSelectedIclcleNodeFirst(false);
  }, [selectedIclcleNode]);
  // 随系统缩放修改画布大小
  useEffect(() => {
    setSvgWidth(w);
  }, [w]);
  useEffect(() => {
    setSvgHeight(h);
  }, [h]);

  useEffect(() => {
    drawICClueChart();
  }, [data]);

  function drawICClueChart() {
    if (data == undefined) return; // 系统初始化的时候直接完成
    if (JSON.stringify(svgWidth) === "{}" || JSON.stringify(svgHeight) === "{}")
      return;
    d3.selectAll("#icclue-chart svg").remove();
    d3.selectAll("#icclue-chart .icicle-viz").remove();

    if (JSON.stringify(data) === "{}") return; // 如果数据为空就不绘制

    var titleSvg = d3
      .select("#icclue-title")
      .append("svg")
      .attr("class", "icicleTitleSvg");
    var titleG = titleSvg
      .style("width", svgWidth * 0.82 + "px")
      .style("height", 20 + "px")
      .append("g")
      .attr("class", "icicleTitleG")
      .attr("transform", "translate(0, 15)");
    titleG
      .selectAll("text")
      .data(["起点", "第一跳", "第二跳"])
      .join("text")
      .text((d) => d)
      .attr("x", (d, i) =>
        i === 0
          ? `${((svgWidth - 20) / 6) * (i * 5 + 1)}`
          : `${((svgWidth - 20) / 6) * (i * 2 + 0.7)}`
      )
      .style("font-size", "12px")
      .style("font-weight", "bolder")
      .style("color", "black")
      .style("line-height", 1)
      .attr("text-align", "center");

    // 修改绘图的方式，如果只有一个，则占满整个画布，如果有多个，则使用滑动条？？？
    for (let i = 0; i < data.length; i++) {
      let skipNum = data[i].skipNum + 1;
      let curSvgHeight = svgHeight * 0.97;
      if (data.length !== 1 && data[i].children.length <= 5)
        curSvgHeight = svgHeight * 0.2;
      else if (data.length !== 1 && data[i].children.length <= 10)
        curSvgHeight = svgHeight * 0.5;
      else if (data.length !== 1 && data[i].children.length <= 20)
        curSvgHeight = svgHeight * 0.6;
      icicleChart = Icicle()
        .orientation("lr")
        .width(((svgWidth * 0.95) / 3) * skipNum + 10)
        // .height(svgHeight * 0.97 / (data.length + 1))
        .height(curSvgHeight)
        .data(data[i])
        .size("height")
        .tooltipContent((d, node) => {
          return `WhoisPhone: <i>${node.data.WhoisPhone}</i><br>
                  WhoisEmail: <i>${node.data.WhoisEmail}</i><br>
                  WhoisName: <i>${node.data.WhoisName}</i><br>
                  pureDomain: <i>${node.data.pureDomain}</i><br>
                  dirtyDomain: <i>${node.data.dirtyDomain}</i>
                `;
        })(document.getElementById("icclue-graph"));
    }
  }

  function btnGetSelectedIcicleNode() {
    let curSelected = icicleChart.getSelectedIcicleNode(); // 获取被选中的节点
    if (prevSelected.sort().toString() !== curSelected.sort().toString()) {
      // 有变化的节点
      prevSelected = [...curSelected];
      setSelectedIclcleNode([...prevSelected]);
    }
  }

  return (
    <div id="icclue-chart" style={{ width: "95%" }}>
      <div id="icclue-control">
        <div id="icclue-title"></div>
        <div id="control">
          <Button
            type="primary"
            size="small"
            style={{ marginTop: "2px" }}
            onClick={btnGetSelectedIcicleNode}
          >
            提交
          </Button>
        </div>
      </div>
      <div id="icclue-graph"></div>
    </div>
  );
}
