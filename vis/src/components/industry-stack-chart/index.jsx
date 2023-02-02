import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import PubSub from "pubsub-js";
import d3ContextMenu from "d3-context-menu";
import "./index.css";
import { Button } from "antd";
import { NodeIndexOutlined } from "@ant-design/icons";
// import { getIdentifyICNodesSds } from "../../apis/api";

let start, end;
export default function IndustryStackChart({ w, h }) {
  const [data, setData] = useState([]);
  const [svgWidth, setSvgWidth] = useState(w);
  const [svgHeight, setSvgHeight] = useState("19.42vh");
  const [dataParam, setDataParam] = useState([]);

  // 传递给其他组件的数据
  const [selectedNodeNumId, setSelectedNodeNumId] = useState(""); // 主图高亮的数据
  const [toPath, setToPath] = useState({ startNode: [], endNode: [] }); // 传递给关键路径识别的算法并在关键路径图中绘制出当前路径


  // 直接设置数据
  PubSub.unsubscribe("industryStackDt");
  PubSub.subscribe("industryStackDt", (msg, coreNodedt) => {
    coreNodedt.sort(function (a, b) {
      let numbera = 0,
        numberb = 0;
      for (let i of a.industry) {
        if (i.industry.replaceAll(" ", "") !== "") {
          numbera += i.number;
        }
      }
      for (let i of b.industry) {
        if (i.industry.replaceAll(" ", "") !== "") {
          numberb += i.number;
        }
      }
      return numberb - numbera;
    });
    setData(coreNodedt);
  });

  // useEffect(() => {
  //   let dt = [
  //     {
  //       id: "IP_40ddb3ae090e2241eba46d1cb972727ae071d4d1e9492867a22ef5dae0036197",
  //       numId: 82811,
  //       industry: [
  //         {
  //           industry: "  ",
  //           number: 91,
  //         },
  //         {
  //           industry: "A",
  //           number: 122,
  //         },
  //         {
  //           industry: "AB",
  //           number: 120,
  //         },
  //         {
  //           industry: "B",
  //           number: 114,
  //         },
  //       ],
  //     },
  //     {
  //       id: "IP_40ee275b710d85051853573a5744b80989c6b5ed11a0ec578ca25aabdd352103",
  //       numId: 367648,
  //       industry: [
  //         {
  //           industry: "  ",
  //           number: 94,
  //         },
  //         {
  //           industry: "A",
  //           number: 113,
  //         },
  //         {
  //           industry: "B",
  //           number: 112,
  //         },
  //       ],
  //     },
  //     {
  //       id: "IP_7b80fc61abc49771fe7f37d3dae62a5815269b09d080f69c5c666f281ad95a73",
  //       numId: 367663,
  //       industry: [
  //         {
  //           industry: "  ",
  //           number: 94,
  //         },
  //         {
  //           industry: "A",
  //           number: 113,
  //         },
  //         {
  //           industry: "B",
  //           number: 121,
  //         },
  //       ],
  //     },
  //     {
  //       id: "IP_1b4d13e7661598f7609c250a3c7cd7a359dbf65915295a5376362671c19d3e4b",
  //       numId: 371918,
  //       industry: [
  //         {
  //           industry: "  ",
  //           number: 72,
  //         },
  //         {
  //           industry: "B",
  //           number: 114,
  //         },
  //         {
  //           industry: "A",
  //           number: 111,
  //         },
  //         {
  //           industry: "C",
  //           number: 110,
  //         },
  //       ],
  //     },
  //     {
  //       id: "IP_abb798b374d28b3fb5411cc2b568a55400fd74111d2ebe1c47ed99d2ff79ec24",
  //       numId: 371928,
  //       industry: [
  //         {
  //           industry: "  ",
  //           number: 71,
  //         },
  //         {
  //           industry: "B",
  //           number: 114,
  //         },
  //         {
  //           industry: "A",
  //           number: 110,
  //         },
  //         {
  //           industry: "G",
  //           number: 212,
  //         },
  //         {
  //           industry: "C",
  //           number: 112,
  //         },
  //       ],
  //     },
  //     {
  //       id: "IP_7d45aa042c08938921a4677ac235e8306e9b91edd135b75dbb9717ab84f12754",
  //       numId: 373656,
  //       industry: [
  //         {
  //           industry: "  ",
  //           number: 89,
  //         },
  //         {
  //           industry: "A",
  //           number: 19,
  //         },
  //         {
  //           industry: "B",
  //           number: 11,
  //         },
  //       ],
  //     },
  //   ];

  // setData(dt);
  // }, []);

  useEffect(() => {
    if (selectedNodeNumId !== "") {
      PubSub.publish("industryStackToMainDt", selectedNodeNumId);
    }
  }, [selectedNodeNumId]);

  useEffect(() => {
    setSvgWidth(w);
  }, [w]);

  useEffect(() => {
    drawChart();
  }, [svgWidth, data]);

  function drawChart() {
    // 清空元素内容
    d3.select("#industry-stack-chart svg").remove();
    d3.select("#industry-stack-chart .stackToolTip").remove();
    // d3.select("#path-button button").remove();
    d3.select("#core-list-title svg").remove();
    document.getElementById("core-list").innerHTML = "";

    if (data.length === 0) return;

    var combinationOrderSet = new Set();
    var innerCirlceColor = { IP: "#33a02c", Cert: "#ff756a" };

    // 获取所有的资产组合和种类
    // let AMin=0, AMax=0, BMin=0, BMax=0, CMin=0, CMax=0, DMin=0, DMax=0, EMin=0, EMax=0, FMin=0, FMax=0, GMin=0, GMax=0, HMIn=0 ,HMax=0, IMin=0, IMax=0;
    let min = 0,
      max = 0,
      IC_index = 0,
      index_numId = {};
    for (let d of data) {
      index_numId[d.numId] = IC_index;
      for (let j in d.industry) {
        if (d.industry[j]["industry"].replaceAll(" ", "") !== "") {
          // 直接只记录黑灰产的最值
          min = Math.min(min, d.industry[j]["number"]);
          max = Math.max(max, d.industry[j]["number"]);
        }
        combinationOrderSet.add(d.industry[j]["industry"]);
      }
      IC_index += 1;
    }
    let combinationOrder = [...combinationOrderSet].sort();
    let industryType = [
      ...new Set([...combinationOrder.toString().replaceAll(",", "")]),
    ].sort(); // 包含的所有产业类型

    min = 10;
    max = 150;
    const AColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#ff9f6d"]);
    const BColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#d88c9a"]);
    const CColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#a17fda"]);
    const DColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#c3e6a1"]);
    const EColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#4caead"]);
    const FColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#64d9d7"]);
    const GColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#82b461"]);
    const HColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#fffb96"]);
    const IColorScale = d3
      .scaleLinear()
      .domain([0, max])
      .range(["#fff", "#87ccff"]);

    const industryColorScale = {
      A: AColorScale,
      B: BColorScale,
      C: CColorScale,
      D: DColorScale,
      E: EColorScale,
      F: FColorScale,
      G: GColorScale,
      H: HColorScale,
      I: IColorScale,
    };

    let gHeight = 50,
      circleR = 5,
      levelNumber = 3;
    let gWidth = (svgWidth * 0.9) / levelNumber;
    const arc = d3
      .arc()
      .innerRadius(
        (i, j) => circleR + ((gHeight - 5) / industryType.length) * j
      )
      .outerRadius(
        (i, j) => circleR + ((gHeight - 5) / industryType.length) * (j + 1)
      )
      .startAngle((i) => ((2 * Math.PI) / combinationOrder.length) * i - 2)
      .endAngle((i) => ((2 * Math.PI) / combinationOrder.length) * (i + 1) - 2)
      .cornerRadius(60)
      .padAngle(0.2);

    let wrapper = d3
      .select("#industry-stack-chart")
      .append("svg")
      .attr("width", svgWidth * 0.9)
      .attr(
        "height",
        (gHeight + circleR + 10) * 2 * (data.length / levelNumber + 1)
      )
      .append("g")
      .attr("transform", (d, i) => {
        let x = gWidth / levelNumber + 10;
        let y = gHeight + circleR * 2;
        return "translate(" + x.toString() + "," + y.toString() + ")";
      });

    // 节点的右键事件
    const menu = [
      {
        title: "资产起点",
        action: function (d) {
          d3.select(this).select("rect").attr("stroke", "green");
          start = index_numId[d.numId];
          setToPath((toPath) => ({
            startNode: [...toPath.startNode, d.numId],
            endNode: [...toPath.endNode],
          }));
        },
      },
      {
        title: "资产终点",
        action: function (d, event) {
          end = index_numId[d.numId];
          d3.select(this).select("rect").attr("stroke", "red");
          setToPath((toPath) => ({
            startNode: [...toPath.startNode],
            endNode: [...toPath.endNode, d.numId],
          }));

          // 向列表里面添加数据
          let list = document.getElementById("core-list");
          let text = start.toString() + "->" + end.toString();
          let linkText = document.createTextNode(text);
          let br = document.createElement("br");
          list.appendChild(linkText);
          list.appendChild(br);
          list.style.fontWeight = "bold";

          if (list.scrollHeight > list.clientHeight) {
            // 出现scroll之后会出现位置偏移的问题，所以出现scroll之后更改元素的位置
            list.style.left = "3px";
          } else {
            list.style.left = "-7px";
          }
        },
      },
    ];

    let g = wrapper
      .selectAll("g")
      .data(data)
      .join("g")
      .attr("class", "stackInnerG")
      .attr("stroke", "#aaa")
      .attr("transform", (d, i) => {
        let x = gWidth * (i % levelNumber);
        let y = (gHeight + circleR + 10) * 2 * Math.floor(i / levelNumber);
        return "translate(" + x.toString() + "," + y.toString() + ")";
      })
      .on("click", function (event, d) {
        if (event.ctrlKey) {
          // 按下Ctrl键 + click 取消选择
          setSelectedNodeNumId("reset-" + d.id); // 取消在主图中高亮当前数据点
        } else {
          setSelectedNodeNumId("set-" + d.id); // 在主图中高亮当前数据点
        }
      })
      .on(
        "contextmenu",
        d3ContextMenu(menu, {
          position: function (d, event) {
            return {
              top: event.y + 10,
              left: event.x + 10,
            };
          },
        })
      );

    g.append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("x", -63)
      .attr("y", -57)
      .attr("class", "bgRect")
      .attr("fill", "transparent")
      .attr("stroke", "#ccc")
      .attr("width", (gHeight + circleR * 2) * 2 + 2)
      .attr("height", (gHeight + circleR * 2) * 2 - 5)
      .on("click", function (event, d) {
        if (event.ctrlKey) {
          // 按下Ctrl键 + click 取消选择
          d3.select(this).attr("fill", "transparent");
        } else {
          d3.select(this).attr("fill", "#ccc");
        }
      });

    g.append("text")
      .attr("transform", (d) => "translate(10,10)")
      .selectAll("tspan")
      .data((d) => d.industry)
      .join("tspan")
      .attr("x", 60)
      .attr("y", (d, i) => {
        return `${i * 1.5 - 2.5}em`;
      })
      .attr("font-weight", "bold")
      .attr("stroke", "none")
      .attr("font-size", (d, i) => {
        if (d.industry.length >= 4) {
          return "10px";
        }
        return "12px";
      })
      .attr("font", "10px segoe ui")
      .style("user-select", "none")
      // .attr("fill", (d, i) => industryColor[i])
      .attr("fill", "#1e1e1e")
      .text((d) => {
        return "#" + d.industry + ": " + d.number;
      });

    // 添加序号
    g.append("text")
      .text((d, i) => "NO." + i)
      .attr("x", 70)
      .attr("y", -40)
      .attr("font-size", "12px")
      .attr("color", "#1e1e1e");

    g.append("circle")
      .attr("r", circleR)
      .attr("fill", "transparent")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("stroke", (d, index) => {
        return innerCirlceColor[d["id"].split("_")[0]];
      })
      .attr("stroke-width", 3);

    var industryStacktoolTip = d3
      .select("#industry-stack-chart")
      .append("div")
      .attr("class", "stackToolTip");

    for (let k = 0; k < data.length; k++) {
      for (let i = 0; i < combinationOrder.length; i++) {
        let currInduYIndex = [],
          first_flag = true,
          indu = 0;
        for (let j = 0; j < industryType.length; j++) {
          d3.select(d3.selectAll(".stackInnerG")._groups[0][k])
            .append("path")
            .attr("d", arc(i, j))
            // .attr("stroke", "#aaa")
            .attr("fill", (d) => {
              if (first_flag) {
                for (let loopIndu in d.industry) {
                  if (
                    combinationOrder.indexOf(
                      d.industry[loopIndu]["industry"]
                    ) === i
                  ) {
                    // 当前产业与当前分区对应的产业一致
                    let currIndu = d.industry[loopIndu]["industry"]; // 当前产业集合，然后获取当前产业集合包含的子产业对应的径向索引
                    currInduYIndex = currIndu
                      .split("")
                      .map((value) => industryType.indexOf(value));
                    currInduYIndex = Array.from(new Set([...currInduYIndex]));
                    indu = loopIndu;
                    break;
                  }
                }
              }
              first_flag = false;
              if (
                currInduYIndex.length !== 0 &&
                currInduYIndex.indexOf(j) !== -1
              ) {
                // return industryColor[j];
                if (industryType[j].replaceAll(" ", "") === "") {
                  return "#369fe4";
                }
                return industryColorScale[industryType[j]](
                  d.industry[indu]["number"]
                );
              }
              return "#ddd";
            })
            .attr("stroke", () => {
              return "none";
            })
            .attr("stroke-width", 0.5)
            .on("mouseover", (event, d) => {
              let htmlText = `id: <strong>${d.id}</strong> <br>产业: <strong>${industryType[j]}</strong>`;
              if (
                currInduYIndex.length !== 0 &&
                currInduYIndex.indexOf(j) !== -1
              ) {
                htmlText += `(${d.industry[indu]["number"]})`;
              }
              industryStacktoolTip
                .style("left", event.pageX + 5 + "px")
                .style("top", event.pageY + 5 + "px")
                .style("visibility", "visible")
                .html(htmlText);
            })
            .on("mouseout", () => {
              industryStacktoolTip.style("visibility", "hidden"); // Hide toolTip
            });
        }
      }
    }

    // 添加右侧的内容
    let listTitleSvg = d3
      .select("#core-list-title")
      .append("svg")
      .attr("width", "80%")
      .attr("height", "100%");

    let listG = listTitleSvg
      .selectAll("g")
      .data(["起点", "终点"])
      .join("g")
      .attr("transform", (d, index) => `translate(${index * 30 + 5}, 5)`);
    listG
      .append("rect")
      .attr("x", 5)
      .attr("y", 5)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", "transparent")
      .attr("stroke", (d, i) => (i === 0 ? "green" : "red"))
      .attr("stroke-width", "2px");
    listG
      .append("text")
      .text((d) => d[0])
      .attr("font-size", "12px")
      .attr("x", (d, index) => 9)
      .attr("y", 20);
  }

  function onClearSelection() {
    d3.selectAll("#industry-stack-chart rect").attr("fill", "transparent");
    d3.selectAll("#industry-stack-chart rect").attr("stroke", "#ccc");
    document.getElementById("core-list").innerHTML = "";
    setSelectedNodeNumId("reset-");
    setToPath({ startNode: [], endNode: [] });
    PubSub.publish("assetsToPathDt", { startNode: [], endNode: [] }); // 传递给关键路径组件空数据，用于清空数据
  }
  function onSubmitToPath() {
    // 向关键路径图传递数据
    PubSub.publish("assetsToPathDt", toPath);
  }

  return (
    <div id="industry-stack" style={{ width: "100%", height: svgHeight }}>
      <div id="industry-stack-chart" style={{ height: svgHeight }}></div>
      <div id="stackControl" style={{ height: svgHeight }}>
        <div
          id="path-button"
          style={{ height: "18%", left: "-10px", position: "relative" }}
        >
          <Button onClick={onClearSelection} type="dashed" size="small">
            清空
          </Button>
          <Button onClick={onSubmitToPath} type="dashed" size="small">
            链路
          </Button>
        </div>
        <div
          id="core-list-title"
          style={{ height: "12%", textAlign: "left" }}
        ></div>
        <div
          id="core-list"
          style={{
            width: "100%",
            height: "62%",
            left: "-7px",
            position: "relative",
          }}
        ></div>
      </div>
    </div>
  );
}
