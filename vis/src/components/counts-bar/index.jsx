import * as d3 from "d3";
import { useEffect, useState } from "react";

export default function CountsBar({ w, h }) {
  // 需要的数据示例：两个数组linksList和nodesList, 两个数组元素顺序对应
  const linksList = [
    { name: "r_cert_chain", value: 2 },
    { name: "r_cert", value: 2 },
    { name: "r_whois_name", value: 2 },
    { name: "r_whois_phone", value: 32 },
    { name: "r_whois_email", value: 12 },
    { name: "r_cname", value: 22 },
    { name: "r_request_jump", value: 42 },
    { name: "r_subdomain", value: 12 },
    { name: "none", value: 0 },
    { name: "r_dns_a", value: 2 },
    { name: "r_cidr", value: 1 },
    { name: "r_asn", value: 2 },
  ];

  const nodesList = [
    { name: "certAsTarget", value: 1 },
    { name: "certAsSource", value: 6 },
    { name: "whoisName", value: 6 },
    { name: "whoisEmail", value: 4 },
    { name: "whoisPhone", value: 7 },
    { name: "domainAsCnameTarget", value: 200 },
    { name: "domainAsJumpTarget", value: 12 },
    { name: "domainAsSubTarget", value: 21 },
    { name: "domainAsSource", value: 8 },
    { name: "ip", value: 5 },
    { name: "ipc", value: 8 },
    { name: "asn", value: 20 },
  ];

  // 统计边和节点总数
  let sumOfLink = 0;
  let sumOfNode = 0;
  linksList.forEach((item) => (sumOfLink += item.value));
  nodesList.forEach((item) => (sumOfNode += item.value));

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
    // 初始化画布
    const dimensions = {
      width: svgWidth,
      height: svgHeight,
      margin: { top: 10, right: 20, bottom: 10, left: 100 },
    };
    const boundedWidth =
      dimensions.width - dimensions.margin.left - dimensions.margin.right;
    const boundedHeight =
      dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    d3.selectAll("div#countsbar svg").remove();
    const svg = d3
      .select("#countsbar")
      .append("svg")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", [0, 0, dimensions.width, dimensions.height])
      .style("max-width", "100%")
      .style("background", "#ddd");

    const bounds = svg
      .append("g")
      .style(
        "transform",
        `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
      );

    let xScale = d3
      .scaleBand()
      .domain(d3.range(nodesList.length))
      .range([0, boundedWidth])
      .padding(0.05);
    let yScaleForNode = d3
      .scaleLinear()
      .domain([0, d3.max(nodesList, (d) => d.value)])
      .range([0, boundedHeight / 2 - dimensions.margin.bottom]);
    let yScaleForLink = d3
      .scaleLinear()
      .domain([0, d3.max(linksList, (d) => d.value)])
      .range([0, boundedHeight / 2 - dimensions.margin.bottom]);
    let colorScaleForNode = d3.scaleSequential(
      d3.extent(nodesList, (d) => d.value),
      d3.interpolateBlues
    );
    let colorScaleForLink = d3.scaleSequential(
      d3.extent(linksList, (d) => d.value),
      d3.interpolateBlues
    );
    // let xAxis = d3.axisBottom().scale(xScale).ticks(nodesList.keys().length);
    // let yAxis = d3.axisLeft().scale(yScale).ticks([]);

    // 分别绘制节点与边的柱状图
    bounds
      .append("g")
      .selectAll("rect")
      .data(nodesList)
      .join("rect")
      .attr("class", "nodecountsbar")
      .attr("x", (d, i) => xScale(i))
      .attr(
        "y",
        (d, i) =>
          boundedHeight / 2 - yScaleForNode(d.value) - dimensions.margin.bottom
      )
      .attr("fill", (d, i) => colorScaleForNode(d.value))
      .attr("height", (d, i) => yScaleForNode(d.value))
      .attr("width", xScale.bandwidth());

    bounds
      .append("g")
      .selectAll("rect")
      .data(linksList)
      .join("rect")
      .attr("class", "linkcountsbar")
      .attr("x", (d, i) => xScale(i))
      .attr("y", (d, i) => boundedHeight - yScaleForLink(d.value))
      .attr("fill", (d, i) => colorScaleForLink(d.value))
      .attr("height", (d, i) => yScaleForLink(d.value))
      .attr("width", xScale.bandwidth());

    // 添加柱状图上数字标识
    bounds
      .append("g")
      .selectAll("text")
      .data(nodesList)
      .join("text")
      .attr("class", "nodecountstext")
      .attr("x", (d, i) => xScale(i))
      .attr("y", (d, i) =>
        Math.max(
          boundedHeight / 2 -
            yScaleForNode(d.value) -
            dimensions.margin.bottom -
            2,
          0
        )
      )
      .text((d) => d.value)
      .style("font-family", "sans-serif")
      .style("font-size", "12px");

    bounds
      .append("g")
      .selectAll("text")
      .data(linksList)
      .join("text")
      .attr("class", "linkcountstext")
      .attr("x", (d, i) => xScale(i))
      .attr("y", (d, i) =>
        Math.max(
          boundedHeight - yScaleForLink(d.value) - dimensions.margin.bottom + 8,
          boundedHeight / 2
        )
      )
      .text((d, i) => {
        if (i !== 8) return d.value;
      })
      .style("font-family", "sans-serif")
      .style("font-size", "12px");

    // 标识节点与边的总数信息
    svg
      .append("g")
      .selectAll("text")
      .data([sumOfNode])
      .join("text")
      .attr("class", "nodecountslabel")
      .attr("x", 20)
      .attr("y", boundedHeight / 2.2)
      .text(`节点: ${sumOfNode}`)
      .style("font-family", "sans-serif")
      .style("font-size", "14px");

    svg
      .append("g")
      .selectAll("text")
      .data([sumOfLink])
      .join("text")
      .attr("class", "linkcountslabel")
      .attr("x", 32)
      .attr("y", boundedHeight)
      .text(`边: ${sumOfLink}`)
      .style("font-family", "sans-serif")
      .style("font-size", "14px");
  }, [svgWidth, svgHeight, linksList, nodesList]);

  return <div id="countsbar" style={{ width: "100%", height: "100%" }}></div>;
}
