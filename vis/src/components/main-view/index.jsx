import { useEffect, useState, React } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import euler from "cytoscape-euler";
import navigator from "cytoscape-navigator";
import coseBilkent from "cytoscape-cose-bilkent";
import undoRedo from "cytoscape-undo-redo";
import PubSub from "pubsub-js";
import {
  UndoOutlined,
  RedoOutlined,
  RollbackOutlined,
  CheckOutlined,
  CaretUpOutlined,
  DownloadOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";
import fcose from "cytoscape-fcose";
import "cytoscape-navigator/cytoscape.js-navigator.css";
import contextMenus from "cytoscape-context-menus";
import { Select, Input, Slider, Button, Checkbox, Tag } from "antd";
import * as d3 from "d3";
import "./index.css";

// 数据请求接口
import { getMainChartSds, getGroupAllInfoSds } from "../..//apis/api.js";

navigator(cytoscape);
undoRedo(cytoscape);
contextMenus(cytoscape);
cytoscape.use(dagre);
cytoscape.use(euler);
cytoscape.use(coseBilkent);
cytoscape.use(fcose);

const { Option } = Select;
const { Search } = Input;

var cy, layoutOption, stylesJson, layout, originData;
var ur, urOption, graphData; // 保留点和边的初状态
var layoutOptionDict = {
  euler: {
    name: "euler",
    fit: true, // whether to fit to viewport
    animate: true, // whether to transition the node positions
    avoidOverlap: true,
    springLength: 10,
    mass: 7,
    // animateFilter: function (node, i) {
    //   return true;
    // }, // 决定是否节点的位置应该被渲染
    // concentric: function (node) {
    //   return node.degree();
    // },
  },
  concentric: {
    name: "concentric",
    fit: true, // whether to fit to viewport
    animate: true, // whether to transition the node positions
    avoidOverlap: true,
    minNodeSpace: 1,
    concentric: function (node) {
      return node.degree();
    },
    levelWidth: function (nodes) {
      // the variation of concentric values in each level
      return nodes.maxDegree() / 5;
    },
    spacingFactor: 0.5,
    animationDuration: 1000, // duration of animation in ms if enabled
  },
  dagre: {
    name: "dagre",
    fit: true, // whether to fit to viewport
    animate: true, // whether to transition the node positions
    avoidOverlap: true,
  },
  coseBilkent: {
    name: "cose-bilkent",
    fit: true,
    animate: true,
    randomize: false,
    avoidOverlap: true,
    nodeRepulsion: 5000,
    idealEdgeLength: 50,
    edgeElasticity: 0.55,
    nestingFactor: 0.1,
    gravity: 0.55,
  },
  fcose: {
    name: "fcose",
    fit: true,
    quality: "default",
    animate: true,
    randomize: true,
    avoidOverlap: true,
    nodeRepulsion: 5000,
    idealEdgeLength: 50,
    edgeElasticity: 0.55,
    gravity: 0.55,
  },
};

let edgeColorStyle = {
  r_cert: "#ff756a",
  r_subdomain:"#34B3F1",
  r_request_jump:"#242F9B",
  r_dns_a:"#33a02c",
  r_whois_name:"#f67f02",
  r_whois_phone:"#f67f02",
  r_whois_email:"#f67f02",
  r_cert_chain:"#f9b4ae",
  r_cname:"#BAABDA",
  r_asn:"#f9bf6f",
  r_cidr:"#7fc97f"
};
export default function MainView({ w, h }) {
  const [svgWidth, setSvgWidth] = useState(w);
  const [svgHeight, setSvgHeight] = useState(h);
  const [searchNodebyId, setSearchNodebyId] = useState(""); //
  const [filterType, setFilterType] = useState([]);
  const [filterFlag, setFilterFlag] = useState(false);
  const [edgeLength, setEdgeLength] = useState(10);
  const [nodeDistance, setNodeDistance] = useState(6);
  const [distanceFlag, setDistanceFlag] = useState(false);
  const [chartLayout, setChartLayout] = useState("euler");
  const [undoOut, setUndoOut] = useState(false);
  const [redoIn, setRedoIn] = useState(false);
  const [rollback, setRollback] = useState(false);
  const [layoutFlag, setLayoutFlag] = useState(false);
  const [arrowFlag, setArrowFlag] = useState(false);
  const [styleCheck, setStyleCheck] = useState(false);
  const [fromTableNode, setFromTableNode] = useState([]);
  const [fromTableLink, setFromTableLink] = useState([]);
  const [fromIndustryStackNode, setFromIndustryStackNode] = useState("");
  const [data, setData] = useState({ nodes: [], links: [] });
  const [nodeNumber, setNodeNumber] = useState(0)
  const [linkNumber, setLinkNumber] = useState(0)
  const [dataFirst, setDataFirst] = useState(true);
  const [dataParam, setDataParam] = useState("");
  const [isSubmit, setIsSubmit] = useState(false); // 判断是否提交了团体数据
  const [showCore, setShowCore] = useState(false); // 是否展示核心资产与关键路径，未提交之前是默认不可以选择的
  const [showCoreAble, setShowCoreAble] = useState(false); // 是否可选展示核心资产与关键路径，未提交之前是默认不可以选择的

  // 给其他组件的数据
  const [resData, setResData] = useState({ nodes: [], links: [] }); // 右侧表格和子弹图的确定的团伙子图
  const [difChartInput, setDifChartInput] = useState({ nodes: [], links: [] }); // 当前主图中的点和边 改变时更新DifChart视图
  const [statistics, setDataStatistics] = useState({ nodes: [], links: [] }); //  对选中的数据点进行统计分析，不一定是团伙子图

  // 随系统缩放修改画布大小
  useEffect(() => {
    setSvgWidth(w);
  }, [w]);
  useEffect(() => {
    setSvgHeight(h);
    drawLegend();
  }, [h]);

  // 监听搜索事件
  useEffect(() => {
    if (searchNodebyId) {
      var j = cy.getElementById(searchNodebyId);
      cy.center(j); // 将被搜索元素居中
      j.select();
    }
  }, [searchNodebyId]);

  // 监听过滤事件
  useEffect(() => {
    if (filterFlag) {
      let ele = filterType[0];
      let type = filterType[1];
      let collection;
      if (ele === "node") {
        collection = cy.elements(ele + "[type='" + type + "']");
      } else {
        collection = cy.elements(ele + "[relation='" + type + "']");
        ur.do("remove", collection.connectedNodes());
      }
      ur.do("remove", collection);
    }
    setFilterFlag(false);
  }, [filterFlag]);

  // 监听主图中节点数据是否变化，如果变化，更新DifChart
  useEffect(() => {
    if (difChartInput.nodes.length !== 0 || difChartInput.links.length !== 0) {
      PubSub.publish("updateDifChart", difChartInput);
    }
  }, [difChartInput]);

  // 当确定了团伙的时候对团伙数据进行统计分析，并获取团伙中的关键路径和核心资产
  useEffect(() => {
    if (resData.nodes.length !== 0) {
      getGroupAllInfoSds({              //  从后端获取子图的全部数据
        nodes: resData.nodes,
        links: resData.links,
        isAll: true,
      }).then((res) => {

        PubSub.publish("combinedNodeTableDt", [
          res.getDetialListSds,
          res.getBulletChartDataSds,
        ]); // 分别向节点表和边表传递数据
        PubSub.publish("combinedLinkTableDt", [
          res.getDetialListSds,
          res.getBulletChartDataSds,
        ]);
        PubSub.publish("industryStackDt", res.getIdentifyICNodesSds); // 将选中的数据传给stack组件
        PubSub.publish("fromMainToInfoList", res.getInfoListSds); // 向info-list传递数据
        PubSub.publish("fromMainToConclusion", res.getFinalDataSds);
        graphData = res.getDetialListSds; // 保存提交后的图的完整数据
        
        // 更新主图的数据就不再对数据进行变化了
        setData(res.getDetialListSds);
      });

      return
    }

    if(isSubmit === true){
      Promise.all([
        fetch("./data/group5/BulletChartData.json").then(function (res) {
          return res.json();
        }),
        fetch("./data/group5/DetialList.json").then(function (res) {
          console.log(res);
          return res.json();
        }),
        fetch("./data/group5/MainChartData.json").then(function (res) {
          return res.json();
        }),
        fetch("./data/group5/FinalData.json").then(function (res) {
          return res.json();
        }),
        fetch("./data/group5/IdentifyICNodes.json").then(function (res) {
          return res.json();
        }),
        fetch("./data/group5/InfoList.json").then(function (res) {
          return res.json();
        }),
      ]).then(function(wholeData){
        // PubSub.publish("combinedNodeTableDt", [
        //   wholeData[1],
        //   wholeData[0],
        // ]); 
        // PubSub.publish("combinedLinkTableDt", [
        //   wholeData[1],
        //   wholeData[0], 
        // ]);
        PubSub.publish("industryStackDt",wholeData[4]);
        // PubSub.publish("fromMainToInfoList", wholeData[5]); 
        // PubSub.publish("fromMainToConclusion", wholeData[3]);

        // 主图的数据
        graphData = wholeData[2]; 
        setData(wholeData[2]);
      })
    }

  }, [resData]);

  // 对选择的数据在右侧表格和核心资产图中进行统计分析
  useEffect(() => {
    if (statistics.nodes.length !== 0) {
      getGroupAllInfoSds({
        nodes: statistics.nodes,
        links: statistics.links,
        isAll: false,
      }).then((res) => {
        PubSub.publish("combinedNodeTableDt", [
          res.getDetialListSds,
          res.getBulletChartDataSds,
        ]); // 分别向节点表和边表传递数据
        PubSub.publish("combinedLinkTableDt", [
          res.getDetialListSds,
          res.getBulletChartDataSds,
        ]);
        PubSub.publish("industryStackDt", res.getIdentifyICNodesSds); // 将选中的数据传给stack组件
        PubSub.publish("fromMainToInfoList", res.getInfoListSds); // 向info-list传递数据
      });
    }
  }, [statistics]);

  // 监听布局是否变化
  useEffect(() => {
    if (layoutFlag) {
      layout.stop();
      layoutOption = layoutOptionDict[chartLayout];
      layout = cy.layout(layoutOption);
      if (edgeLength === 10 && nodeDistance === 10) {
        layout.run();
      } else {
        setEdgeLength(10);
        setNodeDistance(10);
      }
    }
    setLayoutFlag(false);
  }, [chartLayout]);

  // 监听节点和边之间的距离是否变化
  useEffect(() => {
    if (distanceFlag && nodeDistance && edgeLength) {
      layout.stop();
      if (chartLayout === "euler") {
        layoutOption.mass = nodeDistance;
        layoutOption.springLength = edgeLength * 20;
      } else if (chartLayout === "fcose" || chartLayout === "coseBilkent") {
        layoutOption.nodeRepulsion = nodeDistance * 1000;
        layoutOption.idealEdgeLength = edgeLength * 10;
      } else if (chartLayout === "concentric") {
        layoutOption.spacingFactor = 1; // 分辨率
        layoutOption.minNodeSpacing = nodeDistance;
      }
      layout = cy.layout(layoutOption);
      layout.run();
    }
    setDistanceFlag(true);
  }, [nodeDistance, edgeLength]);

  // 获取从diff图中传进来的IC link，并将属于当前IC link路上的所有点高亮起来: "numId,numId"
  PubSub.unsubscribe("fromDiffChartToMain");
  PubSub.subscribe("fromDiffChartToMain", function (msg, ICLink) {
    if (cy) {
      cy.nodes().removeClass("InIClink");
      cy.nodes().removeClass("start_end");
      cy.edges().removeClass("InIClink");

      let arr = ICLink.split(",");
      let reverseICLink = arr[1] + "," + arr[0];
      if (ICLink !== "") {
        let innerNode = [];
        cy.nodes().forEach((ele) => {
          if (ICLink.indexOf(ele.data("numId").toString()) !== -1) {
            // 表明是起点和终点
            ele.addClass("start_end");
            innerNode.push(ele.data("id"));
          } else if (
            ele.data("InICLinks").includes(ICLink) ||
            ele.data("InICLinks").includes(reverseICLink)
          ) {
            ele.addClass("InIClink");
            innerNode.push(ele.data("id"));
          }
        });

        if (innerNode.length !== 0) {
          // 高亮路径上的边
          cy.edges().forEach((ele) => {
            if (
              innerNode.includes(ele.data("source")) &&
              innerNode.includes(ele.data("target"))
            ) {
              ele.addClass("InIClink");
            }
          });
        }
      }
    }
  });

  // 撤销上一步操作
  useEffect(() => {
    if (undoOut) {
      ur.undo();
      getDataForDifChart();
      
      getNodeLinkNumber()  // 获取节点数和边数
    }
    setUndoOut(false);
  }, [undoOut]);

  // 还原上一步撤销
  useEffect(() => {
    if (redoIn) {
      ur.redo();
      getDataForDifChart();
      getNodeLinkNumber()  // 获取节点数和边数
    }
    setRedoIn(false);
  }, [redoIn]);

  // 还原所有操作
  useEffect(() => {
    if (rollback) {
      ur.undoAll();
      getDataForDifChart();
      getNodeLinkNumber()  // 获取节点数和边数
    }
    setRollback(false);
  }, [rollback]);

  // 应用核心资产和关键路径的样式
  useEffect(() => {
    if (showCore) {
      if (cy) {
        cy.nodes().forEach((ele) => {
          // if (ele.data("isCore") === true) {
          //   ele.addClass("isCore");
          // }

          if (ele.data("isCore") === true && ele.data("isDelivery") === false) {
            ele.addClass("isCore");
            console.log('core');
          }else if (ele.data("isCore") === true && ele.data("isDelivery") === true) {   // Domain节点指向的多个IP节点
            console.log('isDelivery');
            ele.addClass("isDelivery");
          }
        });
        cy.edges().forEach((ele) => {
          if (ele.data("isCore") === true) {
            ele.addClass("isCore");
          }
        });
      }
    }

    if (showCoreAble && !showCore) {
      if (cy) {
        cy.nodes().removeClass("isCore");
        cy.nodes().removeClass("isDelivery");
        cy.edges().removeClass("isCore");
      }
    }
  }, [showCore]);

  // 是否添加箭头
  useEffect(() => {
    if (arrowFlag) {
      // cy.edges(":selected").addClass("arrow");


      cy.edges().style({
        "target-arrow-shape": "triangle",
        "target-arrow-color": function(ele){
          return edgeColorStyle[ele.data('relation')]
        },
        "curve-style": "straight",
        "width": 20
      })
    } else if (cy) {
      cy.edges().removeClass("arrow");
    }
  }, [arrowFlag]);

  // 从table中传入数据进行高亮
  PubSub.unsubscribe("tableToMainNodeDt");
  PubSub.subscribe("tableToMainNodeDt", (msg, nodeData) => {
    setFromTableNode(nodeData);
  });
  PubSub.unsubscribe("tableToMainLinkDt");
  PubSub.subscribe("tableToMainLinkDt", (msg, linkData) => {
    setFromTableLink(linkData);
  });
  useEffect(() => {
    if (cy) cy.nodes().removeClass("tablehighlightNode");
    if (fromTableNode.length !== 0) {
      cy.nodes().forEach((ele) => {
        if (fromTableNode.includes(parseInt(ele.json().data["numId"]))) {
          ele.addClass("tablehighlightNode");
        }
      });
    }
  }, [fromTableNode]);
  useEffect(() => {
    if (cy) cy.edges().removeClass("tablehighlightLink");
    if (cy && fromTableLink.length !== 0) {
      cy.edges().forEach((ele) => {
        if (
          fromTableLink.includes(
            ele.json().data["source"] + "-" + ele.json().data["target"]
          )
        ) {
          ele.addClass("tablehighlightLink");
        }
      });
    }
  }, [fromTableLink]);

  // 从industry stack中传入数据进行高亮显示
  PubSub.unsubscribe("industryStackToMainDt");
  PubSub.subscribe("industryStackToMainDt", (msg, industryStackToMainDt) => {
    setFromIndustryStackNode(industryStackToMainDt);
  });
  useEffect(() => {
    // if (cy) cy.nodes().removeClass("stackhighlightNode");
    if (cy && fromIndustryStackNode !== "") {
      if (fromIndustryStackNode.split("-")[0] === "set") {
        cy.$("#" + fromIndustryStackNode.split("-")[1]).addClass(
          "stackhighlightNode"
        );
      } else if (fromIndustryStackNode.split("-")[0] === "reset") {
        if (cy.$("#" + fromIndustryStackNode.split("-").length === 1)) {
          // 选择清除所有高亮的点
          cy.nodes().removeClass("stackhighlightNode");
        } else {
          cy.$("#" + fromIndustryStackNode.split("-")[1]).removeClass(
            "stackhighlightNode"
          );
        }
      }
    }
  }, [fromIndustryStackNode]);

  // 接收skeleton图过来的参数是否变化
  PubSub.unsubscribe("skeletonSelect");
  PubSub.subscribe("skeletonSelect", (msg, nodeLink) => {
    setDataParam(nodeLink);
  });

  // 请求数据并更新图像
  useEffect(() => {
    if (dataParam === "") {
      // 初始化的时候
      setData({ nodes: [], links: [] });
    } else if (dataParam.nodes.length === 0) {
      // 传过来的是空数据，就直接清空主图中的数据
      setData({ nodes: [], links: [] });
      setIsSubmit(false);
      setShowCoreAble(false);
      setDifChartInput({ nodes: [-1], links: [] });
      if (cy) {
        cy.elements().remove(); // 清楚图的数据
      }
    } else {
      let nodes = [];
      let links = [];

      if (cy) {
        cy.nodes().forEach((ele) => {
          nodes.push(ele.json().data);
        });
        cy.edges().forEach((ele) => {
          links.push(ele.json().data);
        });
      }

      getMainChartSds({
        dataParam: dataParam,
        nodes: nodes,
        links: links,
      }).then((res) => {
        console.log(res);
        setData(res);
        setDifChartInput(res);
      });
    }
  }, [dataParam]);

  useEffect(() => {
    if (!dataFirst) {
      drawChart();
      originData = data; // 全局变量的形式保存原始的数据
      dragElement(document.getElementById("main-legend"));
      setStyleCheck(false);
    }
    setDataFirst(false);
  }, [data]);

  // 绘制图形
  function drawChart() {
    d3.selectAll("#main-chart div").remove();
    d3.selectAll("#main-container .mainToolTip").remove();
    d3.selectAll(".cytoscape-navigator").remove();

    if (data.nodes.length === 0) return;

    var nodes, links;
    if (!isSubmit) {
      // 不是提交完成之后的数据
      nodes = data.nodes.map((d) => ({ data: { ...d } }));
      links = data.links.map((d) => ({ data: { ...d } }));
    } else {
      nodes = data.nodes.map((d) => ({
        data: {
          id: d.id,
          industry: d.industry,
          name: d.name,
          isCore: d.isCore,
          isDelivery: d.isDelivery,
          numId: d.numId,
          type: d.type,
        },
      }));
      links = data.links.map((d) => ({ data: { ...d } }));
    }

    Promise.all([
      fetch("./json/cy-style-class.json").then(function (res) {
        return res.json();
      }),
    ]).then(function (fetchData) {
      stylesJson = fetchData[0];
      cy = cytoscape({
        container: document.getElementById("main-chart"),
        elements: {
          nodes: nodes,
          edges: links,
        },
        boxSelectionEnabled: true,
        style: stylesJson,
        hideEdgesOnViewport: true,
        textureOnViewport: true,
      });
      var defaults = {
        container: false,
        viewLiveFramerate: 0,
        thumbnailEventFramerate: 30,
        thumbnailLiveFramerate: false,
        dblClickDelay: 200,
        removeCustomContainer: false,
        // rerenderDelay: 100,
      };
      cy.navigator(defaults);


      getNodeLinkNumber()  // 获取节点数和边数

      layoutOption = layoutOptionDict[chartLayout];
      layout = cy.layout(layoutOption);
      layout.run();

      urOption = {
        isDebug: true,
        actions: {},
        undoableDrag: true,
        stackSizeLimit: undefined,
      };
      ur = cy.undoRedo(urOption);

      document.addEventListener("keydown", function (e) {
        if (e.which === 46) {
          // 按删除键
          var selecteds = cy.$(":selected");
          if (selecteds.length > 0) {
            ur.do("remove", selecteds);
            getDataForDifChart();
            getNodeLinkNumber()  // 获取节点数和边数
          }
        }
        if (e.ctrlKey && e.target.nodeName === "BODY")
          if (e.which === 90) {
            ur.undo();
            getDataForDifChart();
            getNodeLinkNumber()  // 获取节点数和边数
          } else if (e.which === 89) {
            ur.redo();
            getDataForDifChart();
            getNodeLinkNumber()  // 获取节点数和边数
          }
      });

      var maintoolTip = d3
        .select("#main-container")
        .append("div")
        .attr("class", "mainToolTip");
      cy.on("click", "node", function (e) {
        var node = e.target;
      });
      cy.on("mouseover", "node", function (e) {
        var neigh = e.target;
        let curNOdeData = neigh.json().data;
        cy.elements()
          .difference(neigh.outgoers().union(neigh.incomers()))
          .not(neigh)
          .addClass("semitransp"); // 提高非选中的点和其邻居节点的透明度

        // 增加tooltip
        let htmlText;
        if (curNOdeData.type === "Domain") {
          htmlText =
            "<b>" +
            "id: " +
            "</b>" +
            curNOdeData.id +
            "<br>" +
            "<b>" +
            "name: " +
            "</b>" +
            curNOdeData.name +
            "<br>" +
            "<b>" +
            "industry: " +
            "</b>" +
            curNOdeData.industry;
        } else {
          htmlText =
            "<b>" +
            "id: " +
            "</b>" +
            curNOdeData.id +
            "<br>" +
            "<b>" +
            "name: " +
            "</b>" +
            curNOdeData.name;
        }
        maintoolTip
          .style("left", e.renderedPosition.x + 610 + "px")
          .style("top", e.renderedPosition.y + 110 + "px")
          .style("visibility", "visible")
          .html(htmlText);
      });
      cy.on("mouseout", "node", function (e) {
        cy.elements().removeClass("semitransp"); // 将所有元素的透明度还原
        maintoolTip.style("visibility", "hidden");
      });

      var menuOptions = {
        evtType: "cxttap",
        menuItems: [
          {
            id: "select-self-neigh",
            content: "选中节点",
            tooltipText: "选中当前节点和邻居节点",
            selector: "node",
            onClickFunction: function (e) {
              let n = e.target;
              let curNodeId = n.id();
              n.select();
              cy.getElementById(curNodeId).neighborhood().select();
            },
          },
          {
            id: "select-neigh",
            content: "选中邻居节点",
            tooltipText: "选中邻居节点",
            selector: "node",
            onClickFunction: function (e) {
              let n = e.target;
              let curNodeId = n.id();
              cy.getElementById(curNodeId).neighborhood().select();
            },
          },
          {
            id: "select-analyze",
            content: "统计分析",
            tooltipText: "统计分析",
            selector: "node",
            onClickFunction: function (e) {
              let selection = cy.$(":selected"); // 获取当前选中的数据
              let nodes = selection.nodes().map((ele) => ele.json().data);
              let links = selection.edges().map((ele) => ele.json().data);
              setDataStatistics({ nodes: [...nodes], links: [...links] });
            },
          },
          {
            id: "select-mark",
            content: "标记",
            tooltipText: "标记",
            selector: "node",
            onClickFunction: function (e) {
              // let currId = e.target.json().data["id"];
              // // let linkWidth = cy.getElementById(currId).style('width')
              // // console.log(linkWidth);
              // if(e.target.json().data["type"] !== 'Domain'){
              //   cy.getElementById(currId).select()
              // }else{
              //   cy.$(":selected").style({
              //     'border-width': '3px',
              //     'border-color': '#0000ff'
              //   })
              //   .update()
              // }
            },
          },
          {
            id: "select-concel-mark",
            content: "取消标记",
            tooltipText: "取消标记",
            selector: "node",
            onClickFunction: function (e) {
              let currId = e.target.json().data["id"];
              if(e.target.json().data["type"] === 'Domain'){
                cy.getElementById(currId).style({
                  'border-width':  '0px'
                })
                .update()
              }
            },
          },
          {
            id: "copy-self",
            content: "复制id",
            tooltipText: "复制id",
            selector: "node",
            onClickFunction: function (e) {
              let currId = e.target.json().data["id"];
              document.execCommand("Copy", true, currId);
              const temp_input = document.createElement("input");
              document.body.appendChild(temp_input);
              temp_input.setAttribute("value", currId);
              temp_input.select();
              if (document.execCommand("copy")) {
                document.execCommand("copy");
              }
              document.body.removeChild(temp_input);
            },
          },
          {
            id: "copy-name",
            content: "复制name",
            tooltipText: "复制name",
            selector: "node",
            onClickFunction: function (e) {
              let currName = e.target.json().data["name"];
              document.execCommand("Copy", true, currName);
              const temp_input = document.createElement("input");
              document.body.appendChild(temp_input);
              temp_input.setAttribute("value", currName);
              temp_input.select();
              if (document.execCommand("copy")) {
                document.execCommand("copy");
              }
              document.body.removeChild(temp_input);
            },
          },
        ],
      };
      cy.contextMenus(menuOptions);
    });
  }


  // 筛选产业类别
  function onSearchIndustry(value) {
    let searchedIndustry = value.replaceAll(" ", "").toUpperCase();
    if (cy) {
      if (searchedIndustry !== "") {
        if (searchedIndustry === "#") {
          cy.nodes().forEach((ele) => {
            if (ele.data("industry").replaceAll(" ", "") === "") {
              ele.select();
              ele.style("border-width", "3px");
            }
          });
        } else {
          cy.nodes().forEach((ele) => {
            // if (ele.data("industry").trim() === searchedIndustry) {
            //   // ele.select();
            //   // ele.style("border-width", "3px");
            //   ele.remove()
            // }
            if (ele.data("industry").trim() !== searchedIndustry) {
              
              ur.do("remove", ele);
            }
          });
        }
      } else {
        cy.nodes().forEach((ele) => {
          ele.unselect();
          if (!ele.json().data.hasOwnProperty("children")) {
            ele.style("border-width", "0px");
          }
        });
      }
    }
  }

  // 添加节点
  function onAddNode() {
    let newNode = [
      { data: { id: "n1", type: "new" } },
      {
        data: {
          id: "e0",
          source:
            "Cert_022b914fcb91d5f90850e33ef3f59e995fb0a291ddf38d351f6624ca71486a22",
          target: "n1",
        },
      },
    ];
    cy.add(newNode);
    cy.add([
      { data: { id: "n2", type: "new" } },
      {
        data: {
          id: "e1",
          source:
            "Cert_022b914fcb91d5f90850e33ef3f59e995fb0a291ddf38d351f6624ca71486a22",
          target: "n2",
        },
      },
    ]);
  }

  // 根据节点类型过滤掉一些点
  function onFilterNode(nodeType) {
    nodeType = "Domain";
    var collection = cy.elements("node[type = '" + nodeType + "']"); // 使用选择器对元素进行删除
    cy.remove(collection);
  }

  // 过滤对应的回车和按钮提交事件
  function onFilterDetails(e) {
    setFilterType(e);
  }
  function onFilter() {
    setFilterFlag(true);
  }
  function onSearchNode(value) {
    setSearchNodebyId(value);
  }
  function onChangeLayout(value) {
    setLayoutFlag(true);
    setChartLayout(value);
  }
  function onChangeEdgeLength(value) {
    setEdgeLength(value);
  }
  function onChangeNodeDistance(value) {
    setNodeDistance(value);
  }
  function onChangeNodeSize(value){
    if(cy){
      cy.style()
      .selector('node')
      .style({
        width: function (ele) {
          return ele.degree() < 30
            ? 30*value
            : ele.degree() > 100
            ? 100*value
            : ele.degree()*value
        },
        height: function (ele) {
          return ele.degree() < 30
            ? 30*value
            : ele.degree() > 100
            ? 100*value
            : ele.degree()*value
        },
        // 'border-width': function(ele){
        //   if(ele.hasClass('isCore') === true){
        //     return 3*value/2 + 'px'
        //   }
          // return 0
        // }
      })


      cy.style()
      .selector('edge')
      .style({
        width: 3*value/2,
      })
      .update()
      // if(arrowFlag){
      //   cy.edges().style({
      //     "target-arrow-shape": "triangle",
      //     "target-arrow-color": function(ele){
      //       return edgeColorStyle[ele.data('relation')]
      //     },
      //     "curve-style": "straight",
      //     "width": 4*value/2,
      //   })
      // }else{
      //   cy.style()
      //   .selector('edge')
      //   .style({
      //     width: 3*value/2,
      //   })
      //   .update()
      // }

    }
  }
  function filter(inputValue, path) {
    return path.some(
      (option) =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
    );
  }
  function onUndoOut() {
    setUndoOut(true);
  }
  function onRedoIn() {
    setRedoIn(true);
  }
  function onRollback() {
    setRollback(true);
  }
  function addArrow() {
    setArrowFlag(!arrowFlag);
  }

  // 获取确定当前为一个子图并在右侧展示子图的数据
  function onSubmitRes() {
    setIsSubmit(true); // 确定提交
    setShowCoreAble(true); // 提交之后可以应用核心资产和关键路径的样式
    if(cy){
      let nodes, links;
      nodes = cy.nodes().map(function (ele, i) {
        return ele.json().data;
      });
      links = cy.edges().map(function (ele, i) {
        return ele.json().data;
      });
      // setIsSubmit(true); // 确定提交
      // setShowCoreAble(true); // 提交之后可以应用核心资产和关键路径的样式
      setResData({ nodes: [...nodes], links: [...links] });
    }
    else{
      setResData({ nodes: [], links: [] });
    }
  }

  // 将数据传给diff chart
  function getDataForDifChart() {
    let currICNodes = cy.nodes().filter((ele, index) => {
      // 获取当前图中有的IC节点
      ele.removeClass("start_end");
      ele.removeClass("InIClink");
      return ele.data("type") === "IP" || ele.data("type") === "Cert";
    });
    currICNodes = currICNodes.map((item, index) => {
      // 获取当前图中IC节点的 numId
      return item.data("numId");
    });

    let graphnodes, graphlinks;
    graphnodes = cy.nodes().map(function (ele, i) {
      // let inICLinks = data.nodes.filter((item, index) => {  // 获取原始数据中的与当前图中相对应的节点
      let inICLinks = originData.nodes.filter((item, index) => {
        // 获取原始数据中的与当前图中相对应的节点
        return item["id"] === ele.data("id");
      });

      inICLinks = inICLinks[0]["InICLinks"];

      
      let inICLinksAfterDelete = []; // 删除后的ICLinks
      console.log(inICLinks);
      if(inICLinks == undefined) return

      inICLinks.forEach((item, index) => {
        let l = item.split(",");
        let s, t;
        if (l.length === 2) {
          //  "1,1"
          s = l[0]; // 取该链路的source
          t = l[1]; // 取该链路的target

          if (
            currICNodes.includes(parseInt(s)) &&
            currICNodes.includes(parseInt(t))
          ) {
            inICLinksAfterDelete.push(item);
          }
          // else if (
          //   !currICNodes.includes(parseInt(s)) &&
          //   currICNodes.includes(parseInt(t))
          // ) {
          //   inICLinksAfterDelete.push(t);
          // } else if (
          //   !currICNodes.includes(parseInt(t)) &&
          //   currICNodes.includes(parseInt(s))
          // ) {
          //   inICLinksAfterDelete.push(s);
          // }
        } else if (l.length === 1) {
          s = l[0];
          if (currICNodes.includes(parseInt(s))) {
            inICLinksAfterDelete.push(item);
          }
        }
      });
      ele.data("InICLinks", inICLinksAfterDelete);
      return ele.json().data;
    });
    graphlinks = cy.edges().map(function (ele, i) {
      ele.removeClass("InIClink");
      return ele.json().data;
    });

    setDifChartInput({ nodes: [...graphnodes], links: [...graphlinks] });
  }

  // 复选框确定是否添加样式
  function applyStyle(e) {
    setStyleCheck(!styleCheck);
    if (e.target.checked) {
      // 读取新的样式文件获取样式
      Promise.all([
        fetch("./json/cy-style-details.json").then(function (res) {
          return res.json();
        }),
      ]).then(function (fetchData) {
        let styleDetailsJson = fetchData[0];
        styleDetailsJson = [...styleDetailsJson, ...stylesJson];
        let newStyleArr = {
          selector: "node",
          style: {
            width: function (ele) {
              return ele.degree() < 30
                ? 30
                : ele.degree() > 100
                ? 100
                : ele.degree();
            },
            height: function (ele) {
              return ele.degree() < 30
                ? 30
                : ele.degree() > 100
                ? 100
                : ele.degree();
            },
          },
        };
        let domainNodeStyle = {
          selector: 'node[type="Domain"]',
          style: {
            "border-style": function (ele) {
              if (ele.json().data.hasOwnProperty("children")) {
                return "double";
              }
              return "solid";
            },
            // "border-color": function (ele) {
            //   if (ele.json().data.hasOwnProperty("children")) {
            //     return "black";
            //   }
            //   // return '1px'
            //   return "#";
            // },
            "border-width": function (ele) {
              if (ele.json().data.hasOwnProperty("children")) {
                return "5px";
              }
              // return '1px'
              return "0px";
            },
            "pie-size": "95%",
            "pie-1-background-color": "#ff9f6d",
            "pie-1-background-size": function (ele, curIndustry = "A") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-2-background-color": "#d88c9a",
            "pie-2-background-size": function (ele, curIndustry = "B") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-3-background-color": "#a17fda",
            "pie-3-background-size": function (ele, curIndustry = "C") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-4-background-color": "#c3e6a1",
            "pie-4-background-size": function (ele, curIndustry = "D") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-5-background-color": "#4caead",
            "pie-5-background-size": function (ele, curIndustry = "E") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-6-background-color": "#64d9d7",
            "pie-6-background-size": function (ele, curIndustry = "F") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-7-background-color": "#82b461",
            "pie-7-background-size": function (ele, curIndustry = "G") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-8-background-color": "#fffb96",
            "pie-8-background-size": function (ele, curIndustry = "H") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
            "pie-9-background-color": "#87ccff",
            "pie-9-background-size": function (ele, curIndustry = "I") {
              if (ele.data("industry").trim() === "") return "0";
              let curIndustryArr = ele.data("industry").trim().split("");
              let cellPie = Math.floor(100 / curIndustryArr.length);
              if (curIndustryArr.includes(curIndustry))
                return cellPie.toString();
              return "0";
            },
          },
        };

        // 如果是提交之后的应用样式，则需要把关键路径和核心资产表示出来
        if (isSubmit) {
          let coreNode = {
            selector: "node",
            style: {
              "border-color": "#ad0c1b",
              "border-width": "3px",
            },
          };
          let coreLink = {
            selector: "edge",
            style: {
              "line-color": "#ad0c1b",
              opacity: "1",
            },
          };
        }
        styleDetailsJson.push(newStyleArr);
        styleDetailsJson.push(domainNodeStyle);
        cy.style().fromJson(styleDetailsJson).update();
      });
    } else {
      cy.style().fromJson(stylesJson).update(); // 恢复到只添加类的样式
    }
  }

  function drawLegend() {
    d3.selectAll("#main-legend-content svg").remove();
    let legendSvg = d3
      .select("#main-legend-content")
      .append("svg")
      .attr("width", "120px")
      .attr("height", "380px");
    // let nodeType = ["Domain", "IP", "IP_C", "Cert", "Whois", "ASN"];
    let nodeType = ["IP", "IP_C", "Cert", "Whois", "ASN"];
    let nodeColor = [
      "#fff",
      "#33a02c",
      "#7fc97f",
      "#ff756a",
      "#f67f02",
      "#f9bf6f",
    ];
    let edgeType = [
      "cert",
      "subdomain",
      "request_jump",
      "dns_a",
      "whois",
      "cert_chain",
      "cname",
      "asn",
      "cidr",
    ];
    let edgeColor= [
      "#ff756a",
      "#34B3F1",
      "#242F9B",
      "#33a02c",
      "#f67f02",
      "#f9b4ae",
      "#BAABDA",
      "#f9bf6f",
      "#7fc97f",
    ];

    let industryType = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    let industryColor = {
      // A: "#fba5fc",
      // B: "#9744ee",
      // C: "#55018b",
      // D: "#d88c9a",
      // E: "#e14b93",
      // F: "#2045e3",
      // G: "#4d7dbd",
      // H: "#74c2ce",
      // I: "#5d6274",

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

    let industryName = {
      A: "涉黄",
      B: "涉赌",
      C: "诈骗",
      D: "涉毒",
      E: "涉枪",
      F: "黑客",
      G: "非法交易平台",
      H: "非法支付平台",
      I: "其他",
    };

    // 添加节点类型的图例
    let nodeTypeWrapper = legendSvg
      .append("g")
      .attr("transform", "translate(5, 0)")
      .attr("class", "node-style-wrapper");
    nodeTypeWrapper
      .append("text")
      .text("节点类型")
      .attr("y", "20px")
      .attr("font-weight", "bold")
      .attr("font-size", "12px");
    let nodeTypeG = nodeTypeWrapper
      .selectAll("g")
      .data(nodeType)
      .join("g")
      .attr(
        "transform",
        (d, i) =>
          "translate(" +
          `${((i + 1) % 2) * 68 + 10}` +
          "," +
          `${Math.floor((i + 1) / 2) * 20 + 40}` +
          ")"
      );

    nodeTypeG
      .append("rect")
      .attr("x", -6)
      .attr("y", -6)
      .attr("height", "12px")
      .attr("width", "12px")
      .attr("fill", (d, i) => nodeColor[i + 1]);

    let domainG = nodeTypeWrapper
      .append("g")
      .attr("transform", "translate(10, 40)");
    domainG
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", "6px")
      .attr("stroke", "#aaa")
      .style("stroke-dasharray", "2, 2")
      .attr("fill", nodeColor[0]);
    domainG
      .append("text")
      .text("Domain")
      .attr("x", 10)
      .attr("y", 3)
      .attr("font-size", "10px");

    nodeTypeWrapper
      .append("g")
      .attr("transform", "translate(10, 40)")
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", "6px")
      .attr("stroke", "#aaa")
      .style("stroke-dasharray", "2, 2")
      .attr("fill", nodeColor[0]);

    nodeTypeG
      .append("text")
      .text((d) => d)
      .attr("x", 10)
      .attr("y", 3)
      .attr("font-size", "10px");

    // 添加边类型的图例
    let edgeTypeWrapper = legendSvg
      .append("g")
      .attr("transform", "translate(8, 90)")
      .attr("class", "edge-type-wrapper");
    edgeTypeWrapper
      .append("text")
      .text("边类型")
      .attr("y", "20px")
      .attr("font-weight", "bold")
      .attr("font-size", "12px");
    let edgeTypeG = edgeTypeWrapper
      .selectAll("g")
      .data(edgeType)
      .join("g")
      .attr(
        "transform",
        (d, i) =>
          "translate(" +
          `${0}`.toString() +
          "," +
          `${i * 12 + 25}`.toString() +
          ")"
      );

    edgeTypeG
      .append("line")
      .attr("x1", 0) //起点横坐标
      .attr("y1", 5)
      .attr("x2", 40)
      .attr("y2", 5)
      .attr("stroke", (d, i) => edgeColor[i])
      .attr("stroke-width", 3);
    edgeTypeG
      .append("text")
      .text((d) => d)
      .attr("x", 45)
      .attr("dy", 8)
      .attr("font-size", "11px");

    // 添加产业类型的图例
    let industryTypeWrapper = legendSvg
      .append("g")
      .attr("transform", "translate(5, 220)")
      .attr("class", "industry-tyle-wrapper");

    industryTypeWrapper
      .append("text")
      .text("产业类型")
      .attr("y", "20px")
      .attr("font-weight", "bold")
      .attr("font-size", "12px");

    let industryTypeG = industryTypeWrapper
      .selectAll("g")
      .data(industryType)
      .join("g")
      .attr(
        "transform",
        (d, i) => "translate(" + `${i * 2 + 3}`.toString() + ",20)"
      );
    industryTypeG
      .append("rect")
      .attr("x", (d, i) => i * 9)
      .attr("y", 10)
      .attr("width", 9)
      .attr("height", 15)
      .attr("fill", (d, i) => industryColor[d])
      .on('mouseover', function(event, d){
        // 高亮包含当前产业的节点
        console.log('2222');
        if(cy){
          cy.nodes().forEach((ele) => {
            if(ele.data('industry').trim('') !== "" && ele.data('industry').trim('').toUpperCase().includes(d)){
              ele.addClass('stackhighlightNode')
            }
          })
        }
      })
      .on('mouseout', function(event, d){
        // 高亮包含当前产业的节点
        if(cy){
          cy.nodes().removeClass('stackhighlightNode')
        }
      })
    industryTypeG
      .append("text")
      .text((d) => d)
      .attr("x", (d, i) => i * 9 + 2)
      .attr("y", 35)
      .attr("font-size", "10px")
      .attr("text-align", "center");

    // 添加产业类型名称的图例
    let start = 0;
    for (let i in industryName) {
      industryTypeWrapper
        .append("g")
        .attr("transform", function () {
          if (start === 6) {
            return "translate(" + `${5}` + "," + `${3 * 16 + 75}` + ")";
          } else if (start === 7) {
            return "translate(" + `${5}` + "," + `${4 * 16 + 75}` + ")";
          } else if (start === 8) {
            return "translate(" + `${5}` + "," + `${5 * 16 + 75}` + ")";
          } else {
            return (
              "translate(" +
              `${(start % 2) * 60 + 5}` +
              "," +
              `${Math.floor(start / 2) * 16 + 75}` +
              ")"
            );
          }
        })
        .append("text")
        .text(i + ": " + industryName[i])
        .attr("font-size", "12px")
        .attr("font-family", "monospace");

      start += 1;
    }
  }
  function onCollapse() {
    d3.select("#main-legend-content").style("display", "none");
  }
  function onExpand() {
    d3.select("#main-legend-content").style("display", "contents");
  }
  // 图例可拖拽
  function dragElement(elmnt) {
    var pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      elmnt.style.top = elmnt.offsetTop - pos2 + "px";
      elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  // 应用核心资产与关键路径的样式
  function applyCoreStyle(e) {
    if (showCoreAble) {
      // 如果可以设置显示样式
      setShowCore(e.target.checked);
    }
  }

  // 下载图数据与子图
  function onDownload() {
    // 下载提交后的子图的数据
    if (graphData != undefined) {
      const tNodeHeader = "id,name,type,industry,isCore,";
      var nodeFilter = ["id", "name", "type", "industry", "isCore"];
      const tLinkHeader = "relation,source,target,isCore,";
      var linkFilter = ["relation", "source", "target", "isCore"];
      // 保存节点信息
      let nodeCsvString = tNodeHeader;
      nodeCsvString += "\r\n";
      graphData.nodes.forEach((item) => {
        nodeFilter.forEach((key) => {
          let value = item[key];
          if (key === "industry") {
            let valueArr;
            if (value === "  ") {
              valueArr = "[]";
            } else {
              valueArr = '"[' + value.split("").toString() + ']"';
            }
            nodeCsvString += valueArr + ",";
          } else {
            nodeCsvString += value + ",";
          }
        });
        nodeCsvString += "\r\n";
      });
      nodeCsvString =
        "data:text/csv;charset=utf-8,\ufeff" +
        encodeURIComponent(nodeCsvString);
      let nodeLink = document.createElement("a");
      nodeLink.href = nodeCsvString;
      nodeLink.download = "节点.csv";
      document.body.appendChild(nodeLink);
      nodeLink.click();
      document.body.removeChild(nodeLink);

      // 保存边的信息
      let linkCsvString = tLinkHeader;
      linkCsvString += "\r\n";
      graphData.links.forEach((item) => {
        linkFilter.forEach((key) => {
          let value = item[key];
          linkCsvString += value + ",";
        });
        linkCsvString += "\r\n";
      });
      linkCsvString =
        "data:text/csv;charset=utf-8,\ufeff" +
        encodeURIComponent(linkCsvString);
      let linkLink = document.createElement("a");
      linkLink.href = linkCsvString;
      linkLink.download = "边.csv";
      document.body.appendChild(linkLink);
      linkLink.click();
      document.body.removeChild(linkLink);

      // 下载图片
      if (cy) {

        let blob = cy.png({
          output: "blob",
          bg: "transparent",
          full: true,
          scale: 1,
          // quality: 1,
          maxWidth: 10000,
          maxHeight: 10000,
        });
        let aLink = document.createElement("a");
        let evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", true, true);
        aLink.download = `${new Date().getTime()}.png`;
        aLink.href = URL.createObjectURL(blob);
        aLink.dispatchEvent(evt);
        document.body.appendChild(aLink);
        aLink.click();
        document.body.removeChild(aLink);


        // // 下载canvas的方式下载： 效果差，还不能显示全部
        // var canvas = document.getElementsByTagName("canvas")[4]
        
        // var anchor = document.createElement("a");
        // anchor.href = canvas.toDataURL("image/png");
        // anchor.download = "IMAGE.png";
        // anchor.click();

      }



      // 下载整个子图的数据
      // var dataBlob = new Blob([JSON.stringify(graphData)], {
      //   type: "text/json",
      // });
      // var e = document.createEvent("MouseEvents");
      // var a = document.createElement("a");
      // a.download = "graph.json";
      // a.href = window.URL.createObjectURL(dataBlob);
      // a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
      // e.initMouseEvent(
      //   "click",
      //   true,
      //   false,
      //   window,
      //   0,
      //   0,
      //   0,
      //   0,
      //   0,
      //   false,
      //   false,
      //   false,
      //   false,
      //   0,
      //   null
      // );
      // a.dispatchEvent(e);
      return;
    }

    // 下载提交之前的数据
    if (data.nodes.length !== 0) {
      console.log('执行了这个');
      // 下载图片
      if (cy) {
        let blob = cy.png({
          output: "blob",
          bg: "transparent",
          full: true,
          scale: 1,
          maxWidth: 15000,
          maxHeight: 15000,
          // quality: 1,
        });
        let aLink = document.createElement("a");
        let evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", true, true);
        aLink.download = `${new Date().getTime()}.png`;
        aLink.href = URL.createObjectURL(blob);
        aLink.dispatchEvent(evt);
        document.body.appendChild(aLink);
        aLink.click();
        document.body.removeChild(aLink);
      }
      console.log(data);

      // 下载整个子图的数据
      var dataBlob = new Blob([JSON.stringify(data)], {
        type: "text/json",
      });
      var e = document.createEvent("MouseEvents");
      var a = document.createElement("a");
      a.download = "提交前的图.json";
      a.href = window.URL.createObjectURL(dataBlob);
      a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
      e.initMouseEvent(
        "click",
        true,
        true,
      );
      a.dispatchEvent(e);
    }
  }

  function getNodeLinkNumber(){
    if(cy){
      let nodeNum = 0, linkNum = 0;
      cy.nodes().forEach(ele => {
        if(!ele.json().data.hasOwnProperty('children')){   // 没有子节点
          nodeNum += 1
        }else{
          nodeNum += ele.json().data.children.length
        }
      })
      cy.edges().forEach(ele => {
        if(!ele.json().data.hasOwnProperty('children')){   // 没有子节点
          linkNum += 1
        }else{
          linkNum += ele.json().data.children.length
        }
      })

      setNodeNumber(nodeNum)
      setLinkNumber(linkNum)
    }
  }
  
  return (
    <div
      id="main-container"
      style={{ width: "100%", height: svgHeight, background: "#fff" }}
    >
      <div id="main-chart-control">
        <div
          id="data-mani"
          style={{
            display: "flex",
            flexDirection: "row",
            background: "#eaeaea",
            paddingTop: "5px",
            paddingLeft: "10px",
            lineHeight: 2.2,
          }}
        >
          {/*  控制数据 */}
          <div id="main-data-search">
            节点搜索&nbsp;&nbsp;&nbsp;
            <Search
              onSearch={onSearchNode}
              placeholder="输入节点id"
              style={{ width: 200 }}
            />
          </div>
          <div id="main-data-filter" style={{ paddingLeft: "10px" }}>
            产业搜索&nbsp;&nbsp;&nbsp;
            <Search
              onSearch={onSearchIndustry}
              placeholder="产业类型"
              style={{ width: 120 }}
            />
            <Tag color="#87d068" 
              style={{ marginLeft: "50px", fontSize: '14px', lineHeight: 2, width: 70, paddingLeft: 0, textAlign: 'center', fontFamily: 'monospace' }}>点#  {nodeNumber}</Tag>
            <Tag color="#2db7f5"  style={{ fontSize: '14px', lineHeight: 2, width: 70, paddingLeft: 0, textAlign: 'center', fontFamily: 'monospace'  }}>边#  {linkNumber}</Tag>

            <Button
              type="dashed"
              icon={<UndoOutlined />}
              style={{ marginLeft: "60px" }}
              onClick={onUndoOut}
            >
              撤销
            </Button>
            <Button
              type="dashed"
              icon={<RedoOutlined />}
              style={{ marginLeft: "5px" }}
              onClick={onRedoIn}
            >
              重做
            </Button>
            <Button
              type="dashed"
              icon={<RollbackOutlined />}
              style={{ marginLeft: "5px" }}
              onClick={onRollback}
            >
              还原
            </Button>
            <Button
              type="dashed"
              icon={<CheckOutlined />}
              style={{ marginLeft: "5px" }}
              onClick={onSubmitRes}
            >
              提交
            </Button>
            <Button
              type="dashed"
              icon={<DownloadOutlined />}
              style={{ marginLeft: "5px" }}
              onClick={onDownload}
            ></Button>
          </div>
        </div>
        <div
          id="chart-mani"
          style={{
            display: "flex",
            flexDirection: "row",
            background: "#eaeaea",
            paddingTop: "2px",
            paddingLeft: "10px",
            paddingBottom: "5px",
            lineHeight: 2.2,
            whiteSpace: "pre",
          }}
        >
          <div id="main-layout">
            布&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;局&nbsp;&nbsp;&nbsp;
            <Select
              value={chartLayout}
              style={{ width: 80 }}
              onChange={onChangeLayout}
            >
              <Option value="euler">euler</Option>
              <Option value="coseBilkent">coseBilkent</Option>
              <Option value="dagre">dagre</Option>
              <Option value="concentric">concentric</Option>
              <Option value="fcose">fcose</Option>
            </Select>
          </div>
          <div
            id="node-distance"
            style={{
              paddingLeft: "10px",
              display: "flex",
              alignItems: "center",
            }}
          >
            节点距离&nbsp;
            <Slider
              min={1}
              max={200}
              value={nodeDistance}
              onChange={onChangeNodeDistance}
              style={{ width: 120 }}
            />
          </div>
          <div
            id="edge-length"
            style={{
              paddingLeft: "20px",
              display: "flex",
              alignItems: "center",
            }}
          >
            边长&nbsp;
            <Slider
              min={1}
              max={200}
              value={edgeLength}
              onChange={onChangeEdgeLength}
              style={{ width: 120 }}
            />
          </div>
          <div
            id="node-size"
            style={{
              paddingLeft: "20px",
              display: "flex",
              alignItems: "center",
            }}
          >
            节点大小&nbsp;
            <Slider
              min={1}
              max={20}
              onChange={onChangeNodeSize}
              style={{ width: 80 }}
            />
          </div>
          <Checkbox onChange={addArrow}>箭头</Checkbox>
          <Checkbox checked={styleCheck} onChange={applyStyle}>
            样式
          </Checkbox>
          <Checkbox
            checked={showCore}
            onChange={applyCoreStyle}
            disable={showCoreAble}
            id="coreCheckBox"
          >
            核心资产与关键链路
          </Checkbox>
        </div>
      </div>
      <div id="main-legend">
        <div id="legend-header">
          图例
          <CaretUpOutlined
            id="collapse-legend-icon"
            style={{ paddingLeft: "40px" }}
            onClick={onCollapse}
          />
          <CaretDownOutlined
            id="expand-legend-icon"
            style={{ paddingLeft: "10px" }}
            onClick={onExpand}
          />
        </div>
        <div id="legend-divider"></div>
        <div id="main-legend-content"></div>
      </div>
      <div id="navigator"></div>
      <div id="main-chart"></div>
    </div>
  );
}
