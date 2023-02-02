import * as d3 from "d3";
import { curveCatmullRomOpen } from "d3";
import { useEffect, useState } from "react";
import PubSub from "pubsub-js";
import { getDifChartSds } from "../../apis/api.js";
import "./index.css";

export default function DifChart({ w, h }) {
  const [svgWidth, setSvgWidth] = useState(w);
  const [svgHeight, setSvgHeight] = useState(h);
  const [data, setData] = useState(undefined);
  const [selectICLinks, setSelectICLinks] = useState("");

  const [linksInfo, setLinksInfo] = useState({ nodes: [], links: [] });

  // 随主图数据更新而更新视图

  PubSub.unsubscribe("updateDifChart");
  PubSub.subscribe("updateDifChart", (msg, linksInfo) => {
    setLinksInfo(linksInfo);
  });

  // 随系统缩放修改画布大小
  useEffect(() => {
    setSvgWidth(w);
  }, [w]);
  useEffect(() => {
    setSvgHeight(h);
  }, [h]);

  useEffect(() => {
    if (data != undefined) {
      draw();
    }
  }, [svgHeight, data]);

  useEffect(() => {
    if (linksInfo.nodes[0] === -1) {
      // 数据被清空了
      setData([]);
    } else {
      getDifChartSds(linksInfo).then((res) => {
        setData(res);
      });
    }
  }, [linksInfo]);

  // 绘制结构图
  function draw() {
    d3.selectAll("#diff-legend svg").remove();
    d3.selectAll("#all-industry svg").remove();
    d3.selectAll("#diff-chart svg").remove();
    d3.selectAll("#diff-all-chart .diff-tooltip").remove();

    if (JSON.stringify(data) === "[]") return;

    if (data[0].length === 0) return;

    var diffTooltip = d3
      .select("#diff-all-chart")
      .append("div")
      .attr("class", "diff-tooltip");

    let chartHeight = svgHeight * 0.8;
    let colorList = [
      "#4281a4",
      "#9c89b8",
      "#125B50",
      // "#6ECB63",
      "#7E8A97",
      "#c44536",
      "#d88c9a",
      "#B1BCE6",
      "#00917C",
      "#E4AEC5",
    ];
    let industryColorDict = {
      A: "#ff9f6d",
      B: "#d88c9a",
      C: "#a17fda",
      D: "#c3e6a1",
      E: "#4caead",
      F: "#64d9d7",
      G: "#82b461",
      H: "#fffb96",
      I: "#87ccff",
    };

    ///////////////////////////////// 左侧绘制所有产业数量统计图
    let industryMinMax = {};
    let complexColorIndex = 0;
    for (let i = 0; i < data[0].length; i++) {
      // 将每种产业映射到不同的颜色
      if (!industryColorDict.hasOwnProperty(data[0][i].industry)) {
        industryColorDict[data[0][i].industry] = colorList[complexColorIndex];
        complexColorIndex += 1;
      }
      // 统计每张产业中的最大值和最小值
      if (industryMinMax.hasOwnProperty(data[0][i].industry)) {
        industryMinMax[data[0][i].industry].min = Math.min(
          industryMinMax[data[0][i].industry].min,
          data[0][i].number
        );
        industryMinMax[data[0][i].industry].max = Math.max(
          industryMinMax[data[0][i].industry].max,
          data[0][i].number
        );
      } else {
        industryMinMax[data[0][i].industry] = {
          min: data[0][i].number,
          max: data[0][i].number,
        };
      }
    }

    let industrySvg = d3
      .select("#all-industry")
      .append("svg")
      .attr("width", "100%")
      .attr("height", chartHeight + 30);
    let singleInustryHeight = chartHeight / (data[0].length / 2);
    let singleIndustryWidth = 15;
    let industryG = industrySvg
      .append("g")
      .attr("transform", "translate(5, 5)");
    industryG
      .selectAll("rect")
      .data(data[0])
      .join("rect")
      .attr("x", (d, i) => {
        return (i % 2) * singleIndustryWidth - 2;
      })
      .attr("y", (d, i) => {
        return chartHeight - d.height * singleInustryHeight;
      })
      .attr("width", (d, i) => {
        return singleIndustryWidth;
      })
      .attr("height", singleInustryHeight)
      .attr("storke-width", "1px")
      .attr("stroke", "white")
      .attr("fill", (d, i) => {
        return colorScale(
          industryColorDict[d.industry],
          0,
          industryMinMax[d.industry].max,
          d.number
        );
      })
      .on("mouseover", function (event, d) {
        let htmlStr = `<b>${d.industry}:${d.number}</b>`;
        diffTooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px")
          .style("visibility", "visible")
          .html(htmlStr);
      })
      .on("mouseout", function (event, d) {
        diffTooltip.style("visibility", "hidden");
      });

    let wrap_text_nchar = (
      text_element,
      max_width,
      line_height,
      unit = "em"
    ) => {
      if (!line_height) line_height = 1.1;
      const text_array = wrap_text_array(text_element.text(), max_width);
      text_element
        .text(null)
        .selectAll("tspan")
        .data(text_array)
        .enter()
        .append("tspan")
        .attr("x", text_element.attr("x"))
        .attr("y", text_element.attr("y"))
        .attr("dy", (d, i) => `${i * line_height}${unit}`)
        .attr("dx", (d, i) => `${i * 0.5}${unit}`)
        .text((d) => d);
    };

    let wrap_text_array = (text, max_width) => {
      const words = text.split(/\s+/).reverse();
      let word,
        lines = [],
        line = [];
      while ((word = words.pop())) {
        line.push(word);
        if (line.join(" ").length > max_width) {
          line.pop();
          lines.push(line.join(" "));
          line = [word];
        }
      }
      lines.push(line.join(" "));
      return lines;
    };

    industryG
      .selectAll("text")
      .data(["IN", "NOT IN"])
      .join("text")
      .attr("class", "leftText")
      .text((d) => d)
      .attr("x", (d, i) => 10 * i + 1 + i * 1)
      .attr("y", chartHeight + 10);

    industryG.selectAll("text").each(function (d, i) {
      wrap_text_nchar(d3.select(this), 3);
    });

    //////////////////////// 右侧绘制每一对IC之间的产业信息图
    let pairWidth = data[1].length <= 15 ? 350 / data[1].length : 15;
    var ICWidth = data[1].length !== 0 ? (pairWidth + 5) * data[1].length : 10;
    var ICMargin = {
      right: 2,
      left: 0,
      top: 5,
      bottom: 10,
    };

    let ICSvg = d3
      .select("#diff-chart")
      .append("svg")
      .attr("width", ICWidth)
      .attr("height", chartHeight * 1.1);

    let ICPairWrpapper = ICSvg.append("g").attr("class", "ICPairs");

    let pairG = ICPairWrpapper.selectAll("g")
      .data(data[1])
      .join("g")
      .attr("class", "pair-g")
      .attr(
        "transform",
        (d, i) =>
          `translate(${ICMargin.left + i * (pairWidth + 5)}, ${ICMargin.top})`
      )
      .attr("nodeWidth", (d) => {
        return pairWidth;
      })
      .append("text")
      .attr("x", pairWidth / 2 - 3)
      .attr("y", chartHeight + 10)
      .text((d, index) => index)
      .attr("fill", "black")
      .attr("font-size", "8px")
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        if (d3.select(this).attr("fill") === "black") {
          d3.select(this).attr("fill", "red").attr("font-weight", "bolder");
          let curICLink = d.IC.numId.replace("--", ",");
          PubSub.publish("fromDiffChartToMain", curICLink);
        } else {
          d3.select(this).attr("fill", "black").attr("font-weight", "normal");
          PubSub.publish("fromDiffChartToMain", "");
        }
      });

    for (let i = 0; i < data[1].length; i++) {
      // 循环对的数目
      for (let j = 0; j < data[1][i].industry.length; j++) {
        d3.select(d3.selectAll(".pair-g")._groups[0][i])
          .append("rect")
          .attr("x", (d) => {
            return Math.floor(pairWidth / 3) * d.industry[j].index;
          })
          .attr("y", (d) => {
            return chartHeight - d.industry[j].height * singleInustryHeight;
          })
          .attr("width", (d, i) => {
            return pairWidth / 3 - 1;
          })
          .attr("index", (d, i) => {
            return d.industry[j].index;
          })
          .attr("height", singleInustryHeight)
          .attr("fill", (d) => {
            let currIndustry = d.industry[j].industry;
            let currNumber = d.industry[j].number;
            return colorScale(
              industryColorDict[currIndustry],
              0,
              industryMinMax[currIndustry].max,
              currNumber
            );
          })
          .attr("storke-width", "1px")
          .attr("stroke", "white")
          .on("mouseover", (event, d) => {
            let htmlStr = `<b>IC链路: </b>${d.IC.name}<br/><b>产业：</b>${d.industry[j].industry}(${d.industry[j].number})`;
            diffTooltip
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + "px")
              .style("visibility", "visible")
              .html(htmlStr);
          })
          .on("mouseout", function (event, d) {
            diffTooltip.style("visibility", "hidden");
          });
      }
    }

    function colorScale(endColor, min, max, value) {
      let color = d3.scaleLinear().domain([min, max]).range(["#eee", endColor]);
      return color(value);
    }

    // 绘制图例-------------------------------------------------------------------------------------
    let industrySet = data[0].filter((d, index) => {
      if (index % 2 !== 0) {
        return true;
      }
    });
    industrySet = industrySet.map((d) => d.industry);
    let diffLegendSvg = d3
      .select("#diff-legend")
      .append("svg")
      .attr("width", svgWidth*0.95)
      .attr("height", "25px");
    diffLegendSvg
      .append("g")
      .attr("class", "diff-legend")
      .selectAll("rect")
      .data(industrySet)
      .join("rect")
      .attr("fill", (d) => industryColorDict[d])
      .attr("x", (d, i) => {
        return ((svgWidth*0.95 - 5) / industrySet.length) * i;
      })
      .attr("y", 2)
      .attr("height", 20)
      .attr("width", (svgWidth*0.95 - 5) / industrySet.length);
    diffLegendSvg
      .append("g")
      .selectAll("text")
      .data(industrySet)
      .join("text")
      .attr("class", "legend-text")
      .attr("width", (svgWidth*0.95 - 5) / industrySet.length)
      .attr("x", (d, i) => {
        return ((svgWidth*0.95 - 5) / industrySet.length) * (i + 0.5);
      })
      .attr("y", 15)
      .text((d) => {
        return d;
      });
  }

  return (
    <div id="difference-chart">
      <div
        id="diff-legend"
        style={{ width: "100%", height: "5%", paddingLeft: "2px" }}
      ></div>
      <div id="diff-all-chart" style={{ width: "100%", height: "95%" }}>
        <div id="all-industry" style={{ width: "10%", height: "100%" }}></div>
        <div id="diff-chart" style={{ width: "400px", height: "100%" }}></div>
      </div>
    </div>
  );
}
