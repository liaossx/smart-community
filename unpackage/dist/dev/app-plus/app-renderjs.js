var __renderjsModules={};

__renderjsModules.a9f75d12 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    default: () => stdin_default
  });
  var stdin_default = {
    data() {
      return {
        repairChart: null,
        complaintChart: null
      };
    },
    mounted() {
      console.log("ECharts \u6A21\u5757\u5DF2\u6302\u8F7D");
      if (document.getElementById("echarts-script")) {
        console.log("ECharts \u811A\u672C\u5DF2\u5B58\u5728\uFF0C\u7B49\u5F85\u52A0\u8F7D\u5B8C\u6210");
        return;
      }
      this.initCharts();
    },
    methods: {
      initCharts() {
        if (typeof window.echarts === "object" || typeof window.echarts === "function") {
          console.log("ECharts \u5168\u5C40\u5BF9\u8C61\u5DF2\u5B58\u5728\uFF0C\u76F4\u63A5\u521D\u59CB\u5316");
          this.initInstances();
          return;
        }
        console.log("\u6B63\u5728\u52A8\u6001\u52A0\u8F7D ECharts \u811A\u672C...");
        const script = document.createElement("script");
        script.id = "echarts-script";
        script.src = "https://unpkg.com/echarts@5.4.3/dist/echarts.min.js";
        script.onload = () => {
          console.log("ECharts \u811A\u672C\u52A0\u8F7D\u6210\u529F");
          this.initInstances();
        };
        script.onerror = (e) => {
          console.error("ECharts \u811A\u672C\u52A0\u8F7D\u5931\u8D25", e);
          const badScript = document.getElementById("echarts-script");
          if (badScript)
            badScript.remove();
        };
        document.head.appendChild(script);
      },
      initInstances() {
        console.log("\u5F00\u59CB\u521D\u59CB\u5316\u56FE\u8868\u5B9E\u4F8B...");
        const repairDom = document.getElementById("repairChart");
        if (repairDom) {
          if (!this.repairChart) {
            try {
              this.repairChart = window.echarts.init(repairDom);
              console.log("\u62A5\u4FEE\u56FE\u8868\u521D\u59CB\u5316\u6210\u529F");
            } catch (e) {
              console.error("\u62A5\u4FEE\u56FE\u8868\u521D\u59CB\u5316\u5F02\u5E38", e);
            }
          }
          if (this.repairTrend && this.repairTrend.length > 0) {
            console.log("\u521D\u59CB\u5316\u65F6\u7ACB\u5373\u6E32\u67D3\u62A5\u4FEE\u56FE\u8868", this.repairTrend);
            this.updateRepairChart(this.repairTrend);
          }
        }
        const complaintDom = document.getElementById("complaintChart");
        if (complaintDom) {
          if (!this.complaintChart) {
            try {
              this.complaintChart = window.echarts.init(complaintDom);
              console.log("\u6295\u8BC9\u56FE\u8868\u521D\u59CB\u5316\u6210\u529F");
            } catch (e) {
              console.error("\u6295\u8BC9\u56FE\u8868\u521D\u59CB\u5316\u5F02\u5E38", e);
            }
          }
          if (this.complaintType && this.complaintType.length > 0) {
            console.log("\u521D\u59CB\u5316\u65F6\u7ACB\u5373\u6E32\u67D3\u6295\u8BC9\u56FE\u8868", this.complaintType);
            this.updateComplaintChart(this.complaintType);
          }
        }
      },
      updateRepairChart(newValue, oldValue, ownerInstance, instance) {
        console.log("\u6536\u5230\u62A5\u4FEE\u6570\u636E\u66F4\u65B0:", JSON.stringify(newValue));
        if (!this.repairChart) {
          const repairDom = document.getElementById("repairChart");
          if (repairDom && window.echarts) {
            this.repairChart = window.echarts.init(repairDom);
          } else {
            return;
          }
        }
        if (!newValue || newValue.length === 0) {
          console.warn("\u62A5\u4FEE\u6570\u636E\u4E3A\u7A7A\uFF0C\u6E05\u7A7A\u56FE\u8868");
          this.repairChart.clear();
          return;
        }
        const dates = newValue.map((item) => item.date);
        const counts = newValue.map((item) => item.count);
        const option = {
          grid: {
            top: 30,
            bottom: 30,
            left: 40,
            right: 20,
            containLabel: true
          },
          tooltip: {
            trigger: "axis"
          },
          xAxis: {
            type: "category",
            data: dates,
            axisLine: { lineStyle: { color: "#999" } }
          },
          yAxis: {
            type: "value",
            minInterval: 1,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { type: "dashed", color: "#eee" } }
          },
          series: [{
            data: counts,
            type: "line",
            smooth: true,
            areaStyle: {
              color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(132, 250, 176, 0.5)" },
                { offset: 1, color: "rgba(132, 250, 176, 0.05)" }
              ])
            },
            itemStyle: {
              color: "#84fab0"
            },
            lineStyle: {
              width: 3
            }
          }]
        };
        this.repairChart.setOption(option);
      },
      updateComplaintChart(newValue, oldValue, ownerInstance, instance) {
        console.log("\u6536\u5230\u6295\u8BC9\u6570\u636E\u66F4\u65B0:", JSON.stringify(newValue));
        if (!this.complaintChart) {
          const complaintDom = document.getElementById("complaintChart");
          if (complaintDom && window.echarts) {
            this.complaintChart = window.echarts.init(complaintDom);
          } else {
            return;
          }
        }
        if (!newValue || newValue.length === 0) {
          console.warn("\u6295\u8BC9\u6570\u636E\u4E3A\u7A7A\uFF0C\u6E05\u7A7A\u56FE\u8868");
          this.complaintChart.clear();
          return;
        }
        const option = {
          tooltip: {
            trigger: "item"
          },
          legend: {
            bottom: "0%",
            left: "center",
            icon: "circle"
          },
          series: [
            {
              name: "\u6295\u8BC9\u7C7B\u578B",
              type: "pie",
              radius: ["40%", "70%"],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: "#fff",
                borderWidth: 2
              },
              label: {
                show: false
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: 14,
                  fontWeight: "bold"
                }
              },
              data: newValue
            }
          ]
        };
        this.complaintChart.setOption(option);
      }
    }
  };
  return __toCommonJS(stdin_exports);
})();
