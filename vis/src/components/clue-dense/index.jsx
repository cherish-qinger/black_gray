import { useEffect, useRef, useState } from "react";
import "./index.css";
import * as d3 from "d3";
import { Radio } from "antd";
import { getClueDenseDataSds } from "../../apis/api";

import PubSub from "pubsub-js";

const nodeType = ["IP", "Cert"];
const dataType = ["numConnectedDomain", "numDomainWithIn", "rateIn"];
const dataTypeForShow = ["#D", "#DarkD", "ratio"];

let prevIndex = -1; // 记录鼠标上一个坐标位置对应的数据index
let colorList = [
  "#369fe4",
  "#56cbf9",
  "#97d1f4",
  "#a0dcf0",
  "#ade2f4",
  "#bae8f8",
  "#caeffb",
  "#caf0f8",
  "#fecf81",
  "#f9844a",
];
export default function ClueDense({ w, h }) {
  const [data, setData] = useState({ IP: [], Cert: [] });
  const [currNodeType, setCurrNodeType] = useState(nodeType[0]);
  const [currDataType, setCurrDataType] = useState(dataType[0]);

  const currDataTypeRef = useRef(currDataType);

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
    drawLegend();
    getClueDenseDataSds().then((res) => {
      setData(res);
    });
  }, []);

  useEffect(() => {
    if (data.IP.length !== 0) {
      drawClueDense();
    }
  }, [data, currNodeType, currDataType]);

  function drawClueDense() {
    // // 删除div下canvas 重新绘制
    document.getElementById("clue-dense-chart-shape").remove();
    document.getElementById("clue-dense-chart-mouse").remove();
    let canvas = document.createElement("canvas");
    canvas.id = "clue-dense-chart-shape";

    let canvas_mouse = document.createElement("canvas");
    canvas_mouse.id = "clue-dense-chart-mouse";

    document.getElementById("clue-dense-chart").appendChild(canvas);
    document.getElementById("clue-dense-chart").appendChild(canvas_mouse);

    const hdlMouseMove = function (event) {
      event.stopPropagation();
      let { x, y } = getMousePosition(event, canvas);
      let r = Math.floor(y / squareSize);
      let c = Math.floor(x / squareSize);
      let index = r * oneLine + c;
      if (prevIndex !== index && index >= 0 && index < currdata.length) {
        ctx_mouse.clearRect(0, 0, boundedWidth, boundedHeight);
        ctx_mouse.strokeStyle = "#333";
        ctx_mouse.strokeRect(
          (index % oneLine) * squareSize,
          parseInt(index / oneLine) * squareSize,
          squareSize,
          squareSize
        );
        prevIndex = index;

        let d = currdata[index];
        // 显示当前数值
        if (currDataTypeRef.current === "rateIn") {
          d3.select("div#clue-dense-control-info").text(
            d.name + " - " + (d[currDataTypeRef.current] * 100).toFixed(2) + "%"
          );
        } else {
          d3.select("div#clue-dense-control-info").text(
            d.name + " - " + d[currDataTypeRef.current]
          );
        }
      }
    };

    const hdlClick = function (event) {
      let { x, y } = getMousePosition(event, canvas);
      let r = Math.floor(y / squareSize);
      let c = Math.floor(x / squareSize);
      let index = r * oneLine + c;
      let d = currdata[index];
      PubSub.publish("getClueFromDense", {
        numId: d.numId,
        Id: d.Id.split("_")[0],
      });
    };

    const dimensions = {
      width: svgWidth * 0.98,
      height: svgHeight * 0.99,
      margin: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
    };
    const boundedWidth = dimensions.width;
    const boundedHeight = dimensions.height;

    let currdata = data[currNodeType];

    let containerRatio = dimensions.width / dimensions.height;
    let squareSize =
      dimensions.height /
      Math.ceil(Math.sqrt(currdata.length / containerRatio));
    let oneLine = Math.floor(boundedWidth / squareSize); //需要画多少列 画不下完整一列时，增加列数 列数取floor
    let rows = Math.ceil(currdata.length / oneLine);

    canvas = document.getElementById("clue-dense-chart-shape");
    canvas.height = boundedHeight;
    canvas.width = boundedWidth;
    const ctx = canvas.getContext("2d");

    canvas_mouse = document.getElementById("clue-dense-chart-mouse");
    canvas_mouse.height = boundedHeight;
    canvas_mouse.width = boundedWidth;
    const ctx_mouse = canvas_mouse.getContext("2d");
    ctx_mouse.globalAlpha = 1;

    let colorScale;
    if (currNodeType === "IP" && currDataType === "numConnectedDomain") {
      colorScale = d3
        .scaleThreshold()
        .domain([
          d3.min(currdata, (d) => d[currDataType]),
          5,
          10,
          20,
          30,
          50,
          65,
          80,
          100,
          d3.max(currdata, (d) => d[currDataType]),
        ])
        .range(colorList);
    } else if (currNodeType === "IP" && currDataType === "numDomainWithIn") {
      colorScale = d3
        .scaleThreshold()
        .domain([
          d3.min(currdata, (d) => d[currDataType]),
          3,
          6,
          10,
          15,
          20,
          25,
          30,
          40,
          d3.max(currdata, (d) => d[currDataType]),
        ])
        .range(colorList);
    } else if (
      currNodeType === "Cert" &&
      currDataType === "numConnectedDomain"
    ) {
      colorScale = d3
        .scaleThreshold()
        .domain([
          d3.min(currdata, (d) => d[currDataType]),
          2,
          3,
          4,
          6,
          8,
          10,
          20,
          30,
          d3.max(currdata, (d) => d[currDataType]),
        ])
        .range(colorList);
    } else if (currNodeType === "Cert" && currDataType === "numDomainWithIn") {
      colorScale = d3
        .scaleThreshold()
        .domain([
          d3.min(currdata, (d) => d[currDataType]),
          1,
          2,
          3,
          5,
          8,
          10,
          20,
          30,
          d3.max(currdata, (d) => d[currDataType]),
        ])
        .range(colorList);
    } else if (currNodeType === "IP" && currDataType === "rateIn") {
      colorScale = d3
        .scaleThreshold()
        .domain([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 0.9, 1])
        .range(colorList);
    } else if (currNodeType === "Cert" && currDataType === "rateIn") {
      colorScale = d3
        .scaleThreshold()
        .domain([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 0.98, 1])
        .range(colorList);
    }

    for (let d in currdata) {
      ctx.fillStyle = colorScale(currdata[d][currDataType]);
      ctx.fillRect(
        (d % oneLine) * squareSize,
        parseInt(d / oneLine) * squareSize,
        squareSize,
        squareSize
      );
    }

    function getMousePosition(event, canvas) {
      const { clientX, clientY } = event;
      //  获取 canvas 的边界位置
      const { top, left } = canvas.getBoundingClientRect();
      //  计算鼠标在 canvas 在位置
      const x = clientX - left;
      const y = clientY - top;
      return {
        x,
        y,
      };
    }

    canvas_mouse.addEventListener("mousemove", hdlMouseMove, false);
    canvas_mouse.addEventListener("click", hdlClick, false);
  }

  function drawLegend() {
    d3.selectAll("div#clue-dense-legend svg").remove();
    const svg = d3
      .select("div#clue-dense-legend")
      .append("svg")
      .attr("height", 20)
      .attr("width", 150);

    const rects = svg.append("g");
    rects
      .selectAll("rect")
      .data(colorList)
      .join("rect")
      .attr("width", parseInt(150 / colorList.length))
      .attr("height", 20)
      .attr("x", (_, i) => parseInt(150 / colorList.length) * i)
      .attr("y", 0)
      .attr("fill", (d) => d);

    const text = svg.append("g");
    text
      .selectAll("text")
      .data(["少", "多"])
      .join("text")
      .text((d) => d)
      .attr("x", (_, i) => {
        if (i === 0) return 1;
        else return 136;
      })
      .attr("y", 15)
      .attr("font-size", 12)
      .attr("fill", "#fff");
  }

  function onNodeTypeChange(e) {
    setCurrNodeType(e.target.value);
  }

  function onDataTypeChange(e) {
    currDataTypeRef.current = e.target.value;
    setCurrDataType(e.target.value);
  }

  return (
    // <div id="clue-dense" style={{ width: "100%", height: "100%" }}>
    <div id="clue-dense" style={{ width: "100%" }}>
      <div
        id="clue-dense-control"
        style={{ width: "100%", height: "6%", padding: "1px" }}
      >
        <div id="clue-dense-control-nodetype">
          <Radio.Group
            defaultValue={nodeType[0]}
            size="small"
            onChange={onNodeTypeChange}
          >
            {nodeType.map((item) => {
              return <Radio.Button value={item}>{item}</Radio.Button>;
            })}
          </Radio.Group>
        </div>
        <div id="clue-dense-control-datatype">
          <Radio.Group
            defaultValue={dataType[0]}
            size="small"
            onChange={onDataTypeChange}
          >
            {dataType.map((item, index) => {
              return (
                <Radio.Button value={item}>
                  {dataTypeForShow[index]}
                </Radio.Button>
              );
            })}
          </Radio.Group>
        </div>
        <div id="clue-dense-control-info"></div>
        <div id="clue-dense-legend"></div>
      </div>
      <div
        id="clue-dense-chart"
        style={{
          width: "100%",
          height: "94.5%",
          position: "relative",
          padding: "5px ",
        }}
      >
        <canvas id="clue-dense-chart-shape"></canvas>
        <canvas
          id="clue-dense-chart-mouse"
          style={{ position: "absolute", left: 6, top: 5 }}
        ></canvas>
      </div>
    </div>
  );
}
