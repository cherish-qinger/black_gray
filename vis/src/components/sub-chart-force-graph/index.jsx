// import * as d3 from "d3";
// import { useEffect } from "react";
// import ForceGraph from 'force-graph';
// import  { forceManyBodyReuse } from 'd3-force-reuse'


// // 数据请求接口
// import { getMainChartData } from "../..//apis/api.js";

// export default function SubChart2() {
//     useEffect(() => {
//         getMainChartData().then((res) => {
//             // var data = {}
//             // data['nodes'] = res['nodes'].map(value => {
//             //     return {"id": value[0], "name": value[1], "type": value[3], "industry": eval(value[4])}
//             // })

//             // data['links'] = res['links'].map(value => {
//             //     return {"source": parseInt(value[1]), "target": parseInt(value[2])}
//             // })
//             const data = res
//             drawChartForce(data);
//         });
//     });

//     function drawChartForce(data){
//         const highlightNodes = new Set();
//         const highlightLinks = new Set();
//         let hoverNode = null;
//         const NODE_R = 8;
//         // cross-link node objects
//         data.links.forEach(link => {
//             var a, b;
//             data.nodes.forEach(n => {
//                 if(n['id'] == link.source){
//                     a = n;
//                     return
//                 }
//             });
//             data.nodes.forEach(n => {
//                 if(n['id'] == link.target){
//                     b = n;
//                     return
//                 }
//             });
//             if(!a.neighbors){
//                 a.neighbors = []
//             }
//             if(!b.neighbors){
//                 b.neighbors = []
//             }
//             a.neighbors.push(b);
//             b.neighbors.push(a);
    
//             !a.links && (a.links = []);
//             !b.links && (b.links = []);
//             a.links.push(link);
//             b.links.push(link);
//         });
//         console.log(data);
//         const Graph1 = ForceGraph()
//                         (document.getElementById('chart'))
//                         .linkDirectionalParticles(2)
//                         .nodeAutoColorBy('group')
//                         .nodeVal('value')
//                         .linkColor(() => '#efefef')
//                         .graphData(data)
//                         .onNodeHover(node => {
//                             highlightNodes.clear()
//                             highlightLinks.clear()
//                             if(node){
//                                 highlightNodes.add(node);
//                                 node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
//                                 node.links.forEach(link => highlightLinks.add(link));
//                             }
//                             hoverNode = node || null
//                         })
//                         .onLinkHover(link => {
//                             highlightLinks.clear()
//                             highlightNodes.clear()
//                             if(link){
//                                 highlightLinks.add(link);
//                                 highlightNodes.add(link.source)
//                                 highlightNodes.add(link.target)
//                             }
//                         })
//                         .autoPauseRedraw(false) // keep redrawing after engine has stopped
//                         .linkWidth(link => highlightLinks.has(link) ? 5 : 1)
//                         .linkDirectionalParticles(4)
//                         .linkDirectionalParticleWidth(link => highlightLinks.has(link) ? 4 : 0)
//                         .nodeCanvasObjectMode(node => highlightNodes.has(node) ? 'before' : undefined)
//                         .nodeCanvasObject((node, ctx) => {
//                             // add ring just for highlighted nodes
//                             ctx.beginPath();
//                             ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
//                             ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
//                             ctx.fill();
//                         });


//     //     const Graph = ForceGraph()
//     //                     (document.getElementById('chart'))
//     //                     .graphData(data)
//     //                     .d3AlphaDecay(0)
//     //                     .d3VelocityDecay(0.08)
//     //                     .cooldownTime(60000)
//     //                     .nodeAutoColorBy('type')
//     //                     .linkColor(() => 'rgba(0,0,0,0.05)')
//     //                     .zoom(0.05)
//     //                     .enablePointerInteraction(false)
//     //                     .onNodeHover(node => {
//     //                         highlightNodes.clear()
//     //                         highlightLinks.clear()
//     //                         if(node){
//     //                             highlightNodes.add(node);
//     //                             node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
//     //                             node.links.forEach(link => highlightLinks.add(link));
//     //                         }
//     //                         hoverNode = node || null
//     //                     })
//     //                     .onLinkHover(link => {
//     //                         highlightLinks.clear()
//     //                         highlightNodes.clear()

//     //                         if(link){
//     //                             highlightLinks.add(link);
//     //                             highlightNodes.add(link.source)
//     //                             highlightNodes.add(link.target)
//     //                         }
//     //                     })
//     //                     .autoPauseRedraw(false) // keep redrawing after engine has stopped
//     //                     .linkWidth(link => highlightLinks.has(link) ? 5 : 1)
//     //                     .linkDirectionalParticles(4)
//     //                     .linkDirectionalParticleWidth(link => highlightLinks.has(link) ? 4 : 0)
//     //                     .nodeCanvasObjectMode(node => highlightNodes.has(node) ? 'before' : undefined)
//     //                     .nodeCanvasObject((node, ctx) => {
//     //                         // add ring just for highlighted nodes
//     //                         ctx.beginPath();
//     //                         ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
//     //                         ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
//     //                         ctx.fill();
//     //                     });
//     }

    
//     return <div id="chart"></div>;
// }
