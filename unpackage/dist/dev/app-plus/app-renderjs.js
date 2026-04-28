var __renderjsModules={};

__renderjsModules.a9f75d12 = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
        complaintChart: null,
        workOrderChart: null,
        compareChart: null,
        pendingRepairData: null,
        pendingComplaintData: null,
        pendingWorkOrderData: null,
        pendingCompareData: null
      };
    },
    mounted() {
      if (window.echarts) {
        this.initInstances();
      } else {
        this.initCharts();
      }
    },
    methods: {
      initCharts() {
        if (typeof window.echarts === "object") {
          this.initInstances();
          return;
        }
        const script = document.createElement("script");
        script.id = "echarts-script";
        script.src = "https://unpkg.com/echarts@5.4.3/dist/echarts.min.js";
        script.onload = () => this.initInstances();
        document.head.appendChild(script);
      },
      initInstances() {
        if (!window.echarts)
          return;
        const repairDom = document.getElementById("repairChart");
        if (repairDom)
          this.repairChart = window.echarts.init(repairDom);
        const complaintDom = document.getElementById("complaintChart");
        if (complaintDom)
          this.complaintChart = window.echarts.init(complaintDom);
        const workOrderDom = document.getElementById("workOrderChart");
        if (workOrderDom)
          this.workOrderChart = window.echarts.init(workOrderDom);
        const compareDom = document.getElementById("compareChart");
        if (compareDom)
          this.compareChart = window.echarts.init(compareDom);
        if (this.pendingRepairData)
          this.renderRepairChart(this.pendingRepairData);
        if (this.pendingComplaintData)
          this.renderComplaintChart(this.pendingComplaintData);
        if (this.pendingWorkOrderData)
          this.renderWorkOrderChart(this.pendingWorkOrderData);
        if (this.pendingCompareData)
          this.renderCompareChart(this.pendingCompareData);
      },
      baseOption() {
        return {
          backgroundColor: "transparent",
          textStyle: {
            color: "#738090"
          }
        };
      },
      updateRepairChart(newValue) {
        this.pendingRepairData = newValue;
        if (this.repairChart)
          this.renderRepairChart(newValue);
      },
      renderRepairChart(data) {
        if (!data || data.length === 0)
          return;
        const dates = data.map((item) => item.date);
        const counts = data.map((item) => item.count);
        this.repairChart.setOption(__spreadProps(__spreadValues({}, this.baseOption()), {
          grid: { top: 20, bottom: 20, left: 30, right: 10, containLabel: true },
          tooltip: { trigger: "axis" },
          xAxis: {
            type: "category",
            data: dates,
            axisLine: { lineStyle: { color: "#d6dbe1" } },
            axisLabel: { color: "#8a97a4" }
          },
          yAxis: {
            type: "value",
            minInterval: 1,
            axisLine: { show: false },
            splitLine: { lineStyle: { color: "#edf0f3" } },
            axisLabel: { color: "#8a97a4" }
          },
          series: [{
            data: counts,
            type: "line",
            smooth: true,
            symbolSize: 8,
            itemStyle: { color: "#6c88b2" },
            lineStyle: { color: "#6c88b2", width: 3 },
            areaStyle: { color: "rgba(108, 136, 178, 0.16)" }
          }]
        }));
      },
      updateComplaintChart(newValue) {
        this.pendingComplaintData = newValue;
        if (this.complaintChart)
          this.renderComplaintChart(newValue);
      },
      renderComplaintChart(data) {
        if (!data || data.length === 0)
          return;
        this.complaintChart.setOption(__spreadProps(__spreadValues({}, this.baseOption()), {
          color: ["#6a83aa", "#8fa4bd", "#98b1a0", "#b3a088", "#b28f8d"],
          tooltip: { trigger: "item" },
          legend: {
            bottom: "2%",
            left: "center",
            textStyle: { color: "#8a97a4", fontSize: 12 }
          },
          series: [{
            type: "pie",
            radius: ["42%", "68%"],
            data,
            itemStyle: {
              borderRadius: 10,
              borderColor: "#ffffff",
              borderWidth: 3
            },
            label: { color: "#7f8b97" }
          }]
        }));
      },
      updateWorkOrderChart(newValue) {
        this.pendingWorkOrderData = newValue;
        if (this.workOrderChart)
          this.renderWorkOrderChart(newValue);
      },
      renderWorkOrderChart(data) {
        if (!data || data.length === 0)
          return;
        this.workOrderChart.setOption(__spreadProps(__spreadValues({}, this.baseOption()), {
          color: ["#6983a7", "#879bbb", "#9bb7a3", "#b09ca0"],
          tooltip: { trigger: "item" },
          legend: {
            bottom: "2%",
            left: "center",
            textStyle: { color: "#8a97a4", fontSize: 12 }
          },
          series: [{
            type: "pie",
            radius: ["36%", "64%"],
            itemStyle: {
              borderRadius: 8,
              borderColor: "#ffffff",
              borderWidth: 3
            },
            label: { color: "#7f8b97" },
            data
          }]
        }));
      },
      updateCompareChart(newValue) {
        this.pendingCompareData = newValue;
        if (this.compareChart)
          this.renderCompareChart(newValue);
      },
      renderCompareChart(data) {
        if (!data || data.repair === void 0)
          return;
        this.compareChart.setOption(__spreadProps(__spreadValues({}, this.baseOption()), {
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: "3%", right: "4%", bottom: "8%", top: "8%", containLabel: true },
          xAxis: [{
            type: "category",
            data: ["\u603B\u91CF\u5BF9\u6BD4"],
            axisLine: { lineStyle: { color: "#d6dbe1" } },
            axisLabel: { color: "#8a97a4" }
          }],
          yAxis: [{
            type: "value",
            axisLine: { show: false },
            splitLine: { lineStyle: { color: "#edf0f3" } },
            axisLabel: { color: "#8a97a4" }
          }],
          series: [
            { name: "\u62A5\u4FEE\u603B\u6570", type: "bar", barWidth: "24%", data: [data.repair], itemStyle: { color: "#6c88b2", borderRadius: [8, 8, 0, 0] } },
            { name: "\u5DF2\u8F6C\u5DE5\u5355", type: "bar", barWidth: "24%", data: [data.workorder], itemStyle: { color: "#99b39f", borderRadius: [8, 8, 0, 0] } }
          ]
        }));
      }
    }
  };
  return __toCommonJS(stdin_exports);
})();
