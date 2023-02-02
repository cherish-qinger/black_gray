import { useEffect, useState } from "react";
import PubSub from "pubsub-js";
import "./index.css";

export default function ConclusionText() {
  const [conclusionData, setConclusionData] = useState({})
  
  // 监听从主图传递过来的数据
  PubSub.unsubscribe('fromMainToConclusion')
  PubSub.subscribe('fromMainToConclusion',function(msg, text){
    console.log(text);
    setConclusionData(text)
  })
  
  let colorListNode = [
    "#2978b4",
    "#33a02c",
    "#ff756a",
    "#f67f02",
    "#f67f02",
    "#f67f02",
    "#7fc97f",
    "#f9bf6f",
  ];

  let colorListLink = [
    "#1e38a1",
    "#2978b4",
    "#a6cee3",
    "#33a02c",
    "#7fc97f",
    "#ff756a",
    "#f9b4ae",
    "#f67f02",
    "#f67f02",
    "#f67f02",
    "#f9bf6f",
  ];

  
  return (
    JSON.stringify(conclusionData) === '{}' ? <div id="conclusion-text"></div>:
    <div id="conclusion-text">
      以<b>{conclusionData.clue}</b>为线索, 挖掘黑灰产团伙网络资产图。 <br />
      此为一个<b>{conclusionData.groupscope}型</b>黑灰产团伙。
      <br />
      <ul key="conclusion">
        <li key="conclusion-node">
          包含
          <b>
            {conclusionData.num_all_node}
            个节点
          </b>
          ，其中
          {conclusionData.node_num.map((item, index) => {
            if (item !== 0) {
              return (
                <span style={{ color: colorListNode[index] }}>
                  <b>
                    {conclusionData.node_type[index]}类节点{item}个，
                  </b>
                </span>
              );
            }
          })}
        </li>
        <li key="conclusion-link">
          包含
          <b>
            {conclusionData.node_all_link}
            条边
          </b>
          ，其中
          {conclusionData.links_num.map((item, index) => {
            if (item !== 0) {
              return (
                <span style={{ color: colorListLink[index] }}>
                  <b>
                    {conclusionData.link_type[index]}类边{item}条，
                  </b>
                </span>
              );
            }
          })}
        </li>
      </ul>
      该团伙中域名对应的网站包含
      <b>
        {conclusionData.industry_type.map((item, index) => {
          if (index !== conclusionData.num_industry - 1) {
            return <span>{item}、</span>;
          } else return <span>{item}</span>;
        })}
      </b>
      等黑灰产业务，是一个运作<b>{conclusionData.num_industry}种</b>非法业务的
      <b>{conclusionData.group_type}</b>团伙。
      <br />
    </div>
  );
}
