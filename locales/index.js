const host = require("uxp").host;

// 引入所有 JSON 文件
// 注意：UXP 支持直接 require JSON
const strEn = require("./en.json");
const strZh = require("./zh.json");
const strZhTw = require("./zh-tw.json");

function getStrings() {
    const locale = host.uiLocale; // 获取 PS 界面语言，如 "zh_CN", "en_US"
    
    // 简单的语言匹配逻辑
    if (locale.startsWith("zh_TW") || locale.startsWith("zh_HK")) {
        return strZhTw;
    } else if (locale.startsWith("zh")) {
        return strZh;
    } else {
        return strEn; // 默认返回英文
    }
}

// 导出获取到的语言包对象
module.exports = getStrings();