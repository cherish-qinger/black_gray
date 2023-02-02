import * as d3 from "d3";
import { useEffect } from "react";
export default function ArcDiagram() {
  const links = [
    {
      source: { name: "2017", total: 3783131.05 },
      target: { name: "Far West", total: 2908058.35 },
      value: 706713.65,
    },
    {
      source: { name: "2017", total: 3783131.05 },
      target: { name: "Great Lakes", total: 2892208.95 },
      value: 680840.1,
    },
    {
      source: { name: "2017", total: 3783131.05 },
      target: { name: "Mideast", total: 3808981.05 },
      value: 852513.1,
    },
    {
      source: { name: "2017", total: 3783131.05 },
      target: { name: "Plains", total: 3296745.35 },
      value: 784705.65,
    },
    {
      source: { name: "2017", total: 3783131.05 },
      target: { name: "Southwest", total: 3673699.7 },
      value: 758358.55,
    },
    {
      source: { name: "2018", total: 4631417.2 },
      target: { name: "Far West", total: 2908058.35 },
      value: 794760.85,
    },
    {
      source: { name: "2018", total: 4631417.2 },
      target: { name: "Great Lakes", total: 2892208.95 },
      value: 810682.75,
    },
    {
      source: { name: "2018", total: 4631417.2 },
      target: { name: "Mideast", total: 3808981.05 },
      value: 1115504.4,
    },
    {
      source: { name: "2018", total: 4631417.2 },
      target: { name: "Plains", total: 3296745.35 },
      value: 864321.8,
    },
    {
      source: { name: "2018", total: 4631417.2 },
      target: { name: "Southwest", total: 3673699.7 },
      value: 1046147.4,
    },
    {
      source: { name: "2019", total: 3726542.3 },
      target: { name: "Far West", total: 2908058.35 },
      value: 662596.75,
    },
    {
      source: { name: "2019", total: 3726542.3 },
      target: { name: "Great Lakes", total: 2892208.95 },
      value: 681682.75,
    },
    {
      source: { name: "2019", total: 3726542.3 },
      target: { name: "Mideast", total: 3808981.05 },
      value: 857757.85,
    },
    {
      source: { name: "2019", total: 3726542.3 },
      target: { name: "Plains", total: 3296745.35 },
      value: 717995.5,
    },
    {
      source: { name: "2019", total: 3726542.3 },
      target: { name: "Southwest", total: 3673699.7 },
      value: 806509.45,
    },
    {
      source: { name: "2020", total: 4438602.85 },
      target: { name: "Far West", total: 2908058.35 },
      value: 743987.1,
    },
    {
      source: { name: "2020", total: 4438602.85 },
      target: { name: "Great Lakes", total: 2892208.95 },
      value: 719003.35,
    },
    {
      source: { name: "2020", total: 4438602.85 },
      target: { name: "Mideast", total: 3808981.05 },
      value: 983205.7,
    },
    {
      source: { name: "2020", total: 4438602.85 },
      target: { name: "Plains", total: 3296745.35 },
      value: 929722.4,
    },
    {
      source: { name: "2020", total: 4438602.85 },
      target: { name: "Southwest", total: 3673699.7 },
      value: 1062684.3,
    },
  ];

  const nodes = [
    { name: "2017", total: 3783131.05 },
    { name: "2018", total: 4631417.2 },
    { name: "2019", total: 3726542.3 },
    { name: "2020", total: 4438602.85 },
    { name: "Far West", total: 2908058.35 },
    { name: "Great Lakes", total: 2892208.95 },
    { name: "Mideast", total: 3808981.05 },
    { name: "Plains", total: 3296745.35 },
    { name: "Southwest", total: 3673699.7 },
  ];

  useEffect(() => {
    // 初始化画布
    const dimensions = {
      width: 1000,
      height: 500,
      margin: { top: 20, right: 20, bottom: 30, left: 100 },
    };
    const boundedWidth =
      dimensions.width - dimensions.margin.left - dimensions.margin.right;
    const boundedHeight =
      dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    d3.selectAll("div#arcdiagram svg").remove();
    const svg = d3
      .select("#arcdiagram")
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

    let radius = { min: 20, max: 40 };

    let xScale = d3
      .scalePoint()
      .domain(nodes.map((d) => d.name))
      .range([radius.max * 2, boundedWidth - radius.max * 2]);
    let wScale = d3
      .scaleLinear()
      .domain(d3.extent(links.map((d) => d.value)))
      .range([1, 10]);
    let rScale = d3
      .scaleLinear()
      .domain(d3.extent(nodes.map((d) => d.total)))
      .range([radius.min, radius.max]);

    let colorScale = d3
      .scaleOrdinal()
      .domain(nodes.map((d) => d.name))
      .range([
        "#4e79a7",
        "#f28e2c",
        "#e15759",
        "#76b7b2",
        "#59a14f",
        "#edc949",
        "#af7aa1",
        "#ff9da7",
        "#9c755f",
        "#bab0ab",
      ]);

    let arc = (d) => {
      const x1 = xScale(d.source.name),
        x2 = xScale(d.target.name);
      const r = Math.abs(x2 - x1) / 2;
      return `M${x1} ${
        boundedHeight - dimensions.margin.bottom
      } A ${r},${r} 0 0,${x1 < x2 ? 1 : 0} ${x2},${
        boundedHeight - dimensions.margin.bottom
      }`;
    };
    const arcs = bounds
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", (d) => wScale(d.value))
      .attr("d", arc);

    const circles = bounds
      .selectAll(".arcnode")
      .data(nodes)
      .join("g")
      .attr("class", "arcnode")
      .attr(
        "transform",
        (d) =>
          `translate(${xScale(d.name)}, ${
            boundedHeight - dimensions.margin.bottom
          })`
      )
      .call((g) => g.append("text").text((d) => d.name))
      .call((g) =>
        g
          .append("text")
          .attr("dy", "1em")
          .text((d) => d.total)
      );

    circles
      .append("circle")
      .attr("r", (d) => rScale(d.total))
      .attr("fill", (d) => colorScale(d.name));
  });
  return <div id="arcdiagram"></div>;
}
