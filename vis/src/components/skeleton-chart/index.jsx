import * as d3 from "d3";
import { useEffect } from "react";
import { useState } from "react";
import lasso from "./d3-lasso";
import d3ContextMenu from "d3-context-menu";
import PubSub from "pubsub-js";

import "./index.css";
import { getSkeletonChartDataSds } from "../../apis/api";

const d3Lasso = lasso;
var linkedByIndex = {};
var combinationOrderSet = new Set();
let selectedNodeAll = []; // 记录上一次选择的结果
export default function SkeletonChart({ w, h }) {
  const [svgWidth, setSvgWidth] = useState(w);
  const [svgHeight, setSvgHeight] = useState(h);
  const [data, setData] = useState({});
  const [links, setLinks] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState([]);
  // const [selectedNodeAll, setSelectedNodeAll] = useState([]);
  const [selectedNodeFirst, setSelectedNodeFirst] = useState(true);
  const [currIc, setCurrIc] = useState(undefined); // 当前已选择的ic

  // const svgToVbScale = 1.5;
  // const [vbWidth, vbHeight] = [
  //   svgWidth * svgToVbScale,
  //   svgHeight * svgToVbScale,
  // ];

  // 随系统缩放修改画布大小
  useEffect(() => {
    setSvgWidth(w);
  }, [w]);
  useEffect(() => {
    setSvgHeight(h);
  }, [h]);

  // 监听从冰柱图传来的参数
  PubSub.unsubscribe("icicleSelect");
  PubSub.subscribe("icicleSelect", (msg, ic) => {
    setCurrIc(ic);
  });
  useEffect(() => {
    if (typeof currIc !== "undefined") {
      if (currIc.length === 0) {
        // 清空数据
        setData({ nodes: [], links: [] });
        setSelectedNode([]);
        selectedNodeAll = [];
        return;
      }
      getSkeletonChartDataSds(currIc).then((res) => {
        setData(res);
      });
    }
  }, [currIc]);

  // 监听用户选择的节点, 传递给主图
  useEffect(() => {
    if (!selectedNodeFirst) {
      // let returnRes = { nodes: [], links: [] };
      // for (let i in linkedByIndex) {
      //   let source = i.split(",")[0];
      //   let target = i.split(",")[1];
      //   if (selectedNode.includes(parseInt(source)) && selectedNode.includes(parseInt(target)) ) {
      //     returnRes["links"].push({linksNumId: [parseInt(source), parseInt(target)]});
      //   }
      // }
      // for (let j of selectedNode) {
      //   returnRes["nodes"].push({ numId: j });
      // }
      // PubSub.publish("skeletonSelect", returnRes);

      let returnRes = { nodes: [], links: [] };
      for (let i in linkedByIndex) {
        let source = i.split(",")[0];
        let target = i.split(",")[1];
        // 源节点是以前的，目标节点是现在的； 源节点是现在的，目标节点是以前的；源节点和目标节点都是现在的
        if (
          (selectedNodeAll.includes(parseInt(source)) &&
            selectedNode.includes(parseInt(target))) ||
          (selectedNodeAll.includes(parseInt(target)) &&
            selectedNode.includes(parseInt(source))) ||
          (selectedNode.includes(parseInt(source)) &&
            selectedNode.includes(parseInt(target)))
        ) {
          returnRes["links"].push({
            linksNumId: [parseInt(source), parseInt(target)],
          });
        }
      }
      for (let j of selectedNode) {
        // 每次新选择的节点组成nodes
        returnRes["nodes"].push({ numId: j });
      }
      selectedNodeAll = Array.from(
        new Set([...selectedNodeAll, ...selectedNode])
      ); // 选择的所有节点

      // setSelectedNodeAll((selectedNodeAll) => Array.from(new Set([...selectedNodeAll, ...selectedNode]))); // 选择的所有节点
      // console.log(selectedNodeAll, returnRes);

      PubSub.publish("skeletonSelect", returnRes);
    }
    setSelectedNodeFirst(false);
  }, [selectedNode]);

  useEffect(() => {
    let tLink = [],
      tNodes = [];
    if (JSON.stringify(data) !== "{}") {
      linkedByIndex = {}; // 每重新画图就更新边对的关系
      for (let l of data.links) {
        tLink.push(l);
      }
      for (let n in data.nodes) {
        for (let item in data.nodes[n].ICIndustry) {
          combinationOrderSet.add(data.nodes[n].ICIndustry[item]["industry"]);
        }
        tNodes.push({
          ...data.nodes[n],
          group: parseInt(data.nodes[n]["numId"]),
        });
      }
      setLinks([...tLink]);
      setNodes([...tNodes]);
    }
  }, [data]);

  useEffect(() => {
    drawChart();
  }, [nodes, links]);

  // 绘制结构图
  function drawChart() {
    d3.selectAll("div#skeleton-chart svg").remove();
    d3.selectAll("div#skeleton-chart svg").remove();
    d3.selectAll("div#skeleton-chart .skeleton-toolTip").remove();

    if (nodes.length === 0) return;

    let svgToVbScale = nodes.length < 300 ? 1 :  nodes.length < 500? 1.5: 2;
    let vbWidth = svgWidth * svgToVbScale;
    let vbHeight = svgHeight * svgToVbScale;
    // 获取边对的关系
    for (let l of links) {
      let source = l["source"];
      let target = l["target"];
      let sourceNumId, targetNumId;
      for (let n of nodes) {
        if (n.id === source) sourceNumId = n.numId;
        if (n.id === target) targetNumId = n.numId;
      }
      let key = sourceNumId + "," + targetNumId;
      linkedByIndex[key] = 1;
    }
    let combinationOrder = [...combinationOrderSet].sort(); // 包含的所有产业类型组合
    let industryType = [
      ...new Set([...combinationOrder.toString().replaceAll(",", "")]),
    ].sort(); // 包含的所有产业类型

    var skeletonToolTip = d3
      .select("#skeleton-chart")
      .append("div")
      .attr("class", "skeleton-toolTip");

    const svg = d3
      .select("#skeleton-chart")
      .append("svg")
      .attr("width", svgWidth * 0.99)
      .attr("height", svgHeight * 0.99)
      .attr("viewBox", [0, 0, vbWidth, vbHeight]);
    var scaleFactor = 1.2, // 值为1表示紧连边缘的点
      margin = scaleFactor,
      arcWidth = nodes.length <= 5 ? 6 : nodes.length <= 10 ? 4 : 2,
      nodeRadius =
        arcWidth * (industryType.length - 1) === 0
          ? arcWidth + 5
          : arcWidth * (industryType.length + 1),
      linkStrength = undefined;
    const wrapper = svg.append("g").attr("transform", `translate(0, 0)`);
    const link = wrapper
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1)
      .attr("stroke", "#ccc");

    // create groups, links and nodes
    const groups = wrapper.append("g").attr("class", "groups");
    // 节点的右键事件
    const menu = [
      {
        title: "取消选择",
        action: function (groupId, event) {
          d3.select(this).classed("selected", false).attr("fill", "white");
          // .attr("opacity", 0.2);

          // 获取被取消数据对应的numId
          let numId = nodes
            .filter((d) => d.group === groupId)
            .map((d) => d.numId)[0];
          selectedNodeAll = selectedNodeAll.filter((d) => d !== numId); // 从被选择的节点里面清楚这个点

          // setSelectedNode((selectedNode) =>
          //   selectedNode.filter((d) => d !== numId)
          // );
        },
      },
      {
        title: "复制id",
        action: function (groupId, event) {
          // 数据对应的numId
          let numId = nodes
            .filter((d) => d.group === groupId)
            .map((d) => d.id)[0];

          document.execCommand("Copy", true, numId);
          const temp_input = document.createElement("input");
          document.body.appendChild(temp_input);
          temp_input.setAttribute("value", numId);
          temp_input.select();
          if (document.execCommand("copy")) {
            document.execCommand("copy");
          }
          document.body.removeChild(temp_input);
        },
      },
      {
        title: "复制name",
        action: function (groupId, event) {
          // 获取节点对应的name
          let numName = nodes
            .filter((d) => d.group === groupId)
            .map((d) => d.name)[0];

          document.execCommand("Copy", true, numName);
          const temp_input = document.createElement("input");
          document.body.appendChild(temp_input);
          temp_input.setAttribute("value", numName);
          temp_input.select();
          if (document.execCommand("copy")) {
            document.execCommand("copy");
          }
          document.body.removeChild(temp_input);
        },
      },
    ];

    const nodeG = wrapper
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("fill", "white")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("mouseover", function (event, d) {
        let htmlStr =
          "<b>" +
          "name: " +
          "</b>" +
          d.id +
          "<br>" +
          "<b>" +
          "industry: " +
          "</b>" +
          d.ICIndustry.reduce(function (prev, curr) {
            return prev + curr.industry + "(" + curr.number + ");";
          }, "");

        skeletonToolTip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px")
          .style("visibility", "visible")
          .html(htmlStr);
      })
      .on("mouseout", function (event, d) {
        skeletonToolTip.style("visibility", "hidden");
      });

    var innerCirlceColor = { IP: "#33a02c", Cert: "#ff756a" };
    nodeG
      .append("circle")
      .attr("r", 2)
      .attr("fill", "white")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", (d) => innerCirlceColor[d.type]);

    // 绘制每个节点的内部图
    const industryColor = {
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
    const arc = d3
      .arc()
      .innerRadius((i, j) => 2 + arcWidth * j)
      .outerRadius((i, j) => 2 + arcWidth * (j + 1))
      .startAngle((i) => ((2 * Math.PI) / combinationOrder.length) * i - 2)
      .endAngle((i) => ((2 * Math.PI) / combinationOrder.length) * (i + 1) - 2)
      .cornerRadius(50)
      .padAngle(0.1);
    nodeG.append("g").attr("class", "node-g");

    for (let k = 0; k < nodes.length; k++) {
      for (let i = 0; i < combinationOrder.length; i++) {
        let currIndustryIndex = [],
          first_flag = true;
        for (var j = 0; j < industryType.length; j++) {
          d3.select(d3.selectAll(".node-g")._groups[0][k])
            .append("path")
            .attr("d", arc(i, j))
            .attr("stroke", "none")
            .attr("fill", (d) => {
              if (first_flag) {
                for (let indus in d.ICIndustry) {
                  if (
                    combinationOrder.indexOf(
                      d.ICIndustry[indus]["industry"]
                    ) === i
                  ) {
                    // 当前产业与当前弧对应的产业一致
                    let currIndu = d.ICIndustry[indus]["industry"]; // 当前产业集合，然后获取当前产业集合包含的子产业对应的径向索引
                    currIndustryIndex = currIndu
                      .split("")
                      .map((value) => industryType.indexOf(value));
                    break;
                  }
                }
              }
              first_flag = false;
              if (
                currIndustryIndex.length !== 0 &&
                currIndustryIndex.indexOf(j) !== -1
              ) {
                return industryColor[industryType[j]];
              }
              return "#eee";
            });
        }
      }
    }

    // 定义simulation
    const simulation = d3
      .forceSimulation()
      .nodes(nodes)
      .force("charge", d3.forceManyBody().strength(-50));
    if (linkStrength && typeof linkStrength === "number") {
      simulation.force(
        "link",
        d3
          .forceLink()
          .links(links)
          .id((d) => d.id)
          .strength(linkStrength)
      );
    } else {
      simulation.force(
        "link",
        d3
          .forceLink()
          .links(links)
          .id((d) => d.id)
          .strength(0.1)

      );
    }

    simulation
      .force("center", d3.forceCenter(vbWidth / 2, vbHeight / 2))
      .force("collision", d3.forceCollide().radius(nodeRadius * 2));
    simulation.on("tick", tick);
    function tick() {
      nodeG.attr(
        "transform",
        (d) =>
          "translate(" +
          (d.x < 2
            ? (d.x = nodeRadius)
            : d.x > vbWidth - nodeRadius
            ? (d.x = vbWidth - nodeRadius)
            : d.x) +
          "," +
          (d.y < nodeRadius
            ? (d.y = nodeRadius)
            : d.y > vbHeight - nodeRadius
            ? (d.y = vbHeight - nodeRadius)
            : d.y) +
          ")"
      );
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      updateGroups(groupPath, groupIds, nodeG, margin);
    }

    // 选择group中的节点，检索该节点的位置并返回特定点的convex hull（最少为3个点，否则返回null）
    const groupIds = [...new Set(nodes.map((n) => +n.group))]
      .map((groupId) => ({
        groupId: groupId,
        count: nodes.filter((n) => +n.group === groupId).length,
      }))
      .map((group) => group.groupId);

    const groupPath = groups
      .selectAll(".path_placeholder")
      .data(groupIds, (d) => +d)
      .join("g")
      .attr("class", "path_placeholder")
      .attr("groupId", (d) => d)
      .append("path")
      .attr("class", (d) => {
        if (selectedNodeAll.includes(d)) {
          return "selected";
        }
        return "group-background";
      })
      .attr("stroke", "grey")
      .attr("fill", (d) => {
        if (selectedNodeAll.includes(d)) {
          return "#b3efa7";
        }
        return "white";
      })
      .attr("opacity", 1)
      .attr("stroke", "#bbb")
      .on(
        "contextmenu",
        d3ContextMenu(menu, {
          position: function (d, event) {
            //   var elm = this;
            //   var bounds = elm.getBoundingClientRect();
            //   return {
            //     top: bounds.top + bounds.height,
            //     left: bounds.left,
            //   };
            // },
            return {
              top: event.y + 10,
              left: event.x + 10,
            };
          },
        })
      );

    //拖拽节点
    function dragstarted(evt, d) {
      if (!evt.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(evt, d) {
      d.fx = evt.x;
      d.fy = evt.y;
    }
    function dragended(evt, d) {
      if (!evt.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // // 生成group表示，检索group中的节点的位置，返回特定点的convex hull，至少有三个点，否则返回null
    function polygonGenerator(groupId, node) {
      var node_coords = nodeG
        .filter((d) => d.group === groupId)
        .data()
        .map((d) => [d.x, d.y]);
      // 处理点数小于3的组
      if (node_coords.length === 2) {
        let point_x1 = node_coords[0][0],
          point_y1 = node_coords[0][1];
        let point_x2 = node_coords[1][0],
          point_y2 = node_coords[1][1];
        node_coords = [];
        node_coords.push([point_x1, point_y1 + nodeRadius]);
        node_coords.push([point_x1, point_y1 - nodeRadius]);
        node_coords.push([point_x2, point_y2 + nodeRadius]);
        node_coords.push([point_x2, point_y2 - nodeRadius]);
      } else if (node_coords.length === 1) {
        let point_x = node_coords[0][0],
          point_y = node_coords[0][1];
        node_coords = [];
        node_coords.push([point_x - nodeRadius, point_y + nodeRadius]);
        node_coords.push([point_x + nodeRadius, point_y + nodeRadius]);
        node_coords.push([point_x + nodeRadius, point_y - nodeRadius]);
        node_coords.push([point_x - nodeRadius, point_y - nodeRadius]);
      }
      return d3.polygonHull(node_coords);
    }
    function updateGroups(groupPath, groupIds, node, margin) {
      const valueline = d3
        .line()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3["curveCardinalClosed"]);

      groupIds.forEach((groupId) => {
        let centroid = [];
        let path = groupPath
          .filter((d) => d === groupId)
          .attr("transform", "scale(1) translate(0,0)")
          .attr("d", (d) => {
            const polygon = polygonGenerator(d, node);
            centroid = d3.polygonCentroid(polygon);
            // 适当缩放形状：移动g元素到质心点，translate g围绕中心的所有路径
            return valueline(
              polygon.map((point) => [
                point[0] - centroid[0],
                point[1] - centroid[1],
              ])
            );
          });
        d3.select(path.node().parentNode).attr(
          "transform",
          "translate(" +
            centroid[0] +
            "," +
            centroid[1] +
            ") scale(" +
            margin +
            ")"
        );
      });
    }

    // 视图缩放：缩放了就不会有选择
    let zoomHandler = d3
      .zoom()
      .on("zoom", zoomAction)
      .filter(function (event) {
        return !event.button && event.type !== "dblclick";
      });
    function zoomAction(event) {
      wrapper.attr(
        "transform",
        `translate(${event.transform.x}, ${event.transform.y})` +
          "scale(" +
          event.transform.k +
          ")"
      );
    }
    zoomHandler(wrapper);

    // ----------------   LASSO STUFF . ----------------
    function lasso_start() {}

    var lasso_draw = function () {
      lasso.possibleItems().selectAll("path").attr("fill", "#fe919b");
    };

    var lasso_end = function () {
      lasso.selectedItems().selectAll("path").classed("selected", "selected"); // 被选中的节点添加类

      // 保留多次选择的结果
      d3.selectAll(".path_placeholder path")
        .filter(function (d) {
          return d3.select(this).attr("class") !== "selected"; // 没有被选中的节点恢复原来的颜色
        })
        .attr("fill", "white");

      // 获取选中的数据对应的numId
      var groupIdArr = lasso.selectedItems()._groups[0].map((d) => d.__data__);

      // 框选：增加数据点
      if (groupIdArr.length !== 0) {
        let numIdArr = nodes
          .filter((d) => {
            return (
              groupIdArr.includes(parseInt(d.group)) &&
              !selectedNodeAll.includes(parseInt(d.numId))
            );
          })
          .map((d) => {
            return d.numId;
          });
        // 方式一： 将原本的点与新加入的点都放进去
        // setSelectedNode((selectedNode) => Array.from(new Set([...selectedNode, ...numIdArr])));

        // 方式二：每次只加入最新选择的数据点
        setSelectedNode([...numIdArr]); // 重新设置这一次选择的结果
      }
    };

    const lasso = d3Lasso()
      .closePathDistance(305)
      .closePathSelect(true)
      .targetArea(svg)
      .items(d3.selectAll(".path_placeholder"))
      .on("start", lasso_start)
      .on("draw", lasso_draw)
      .on("end", lasso_end);
    svg.call(lasso);
  }

  return <div id="skeleton-chart" style={{ width: "100%" }}></div>;
}
