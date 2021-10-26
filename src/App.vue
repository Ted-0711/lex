<template>
  <div id="app">
    <el-row style="height: 50%">
      <div id="reader">
        <el-header>
          <h1>源程序字符串</h1>
        </el-header>
        <el-main id="main">
          <el-input
            type="textarea"
            rows="12"
            resize="none"
            placeholder="请选择源程序文件或直接输入源程序"
            v-model="sourceCode"
          >
          </el-input>
        </el-main>
        <el-footer>
          <el-row>
            <el-col :span="18">
              <el-input
                placeholder="请选择源程序文件"
                v-model="filePath"
                :disabled="true"
              >
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-button @click="getSourceCode">打开文件</el-button>
            </el-col>
          </el-row>
        </el-footer>
      </div>
      <div id="result">
        <el-header>
          <h1>处理结果</h1>
        </el-header>
        <el-main id="main">
          <el-input
            type="textarea"
            rows="12"
            resize="none"
            placeholder="请选择要进行的操作"
            :readonly="true"
            v-model="resultString"
          >
          </el-input>
        </el-main>
        <el-footer>
          <el-row>
            <el-col :span="12">
              <el-button @click="preProcess" :disabled="stat != 0"
                >预处理</el-button
              >
            </el-col>
            <!-- <el-col :span="12"><div class="deselect">&nbsp;</div></el-col> -->
            <el-col :span="12">
              <el-button @click="lexicalAnalysisTop" :disabled="stat != 1"
                >词法分析</el-button
              >
            </el-col>
          </el-row>
        </el-footer>
      </div>
    </el-row>
    <el-row style="height: 50%">
      <el-col :span="12">
        <h2>符号表</h2>
        <el-table height="300" :data="idList" style="width: 100%">
          <el-table-column prop="index" label="序号" align="center" sortable>
          </el-table-column>
          <el-table-column prop="value" label="标识符" align="center" sortable>
          </el-table-column>
        </el-table>
      </el-col>
      <el-col :span="12">
        <h2>常量表</h2>
        <el-table height="300" :data="constList" style="width: 100%">
          <el-table-column prop="type" label="类型" align="center" sortable>
          </el-table-column>
          <el-table-column prop="index" label="序号" align="center" sortable>
          </el-table-column>
          <el-table-column prop="value" label="值" align="center" sortable>
          </el-table-column>
        </el-table>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
const { dialog } = require("electron").remote;
const path = require("path");
const textDecoder = new TextDecoder("GBK");

export default {
  name: "App",
  components: {},
  data() {
    return {
      sourceCode: "",
      preProcessResult: "",
      lexicalAnalysisResult: "",
      resultString: "",
      filePath: "",
      stat: 0,
      pointer: 0,
      ch: " ",
      strToken: "",
      finishFlag: false,
      errFlag: false,
      // 关键字表
      reserve: [
        "alignas",
        "alignof",
        "and",
        "and_eq",
        "asm",
        "atomic_cancel",
        "atomic_commit",
        "atomic_noexcept",
        "auto",
        "bitand",
        "bitor",
        "bool",
        "break",
        "case",
        "catch",
        "char",
        "char8_t",
        "char16_t",
        "char32_t",
        "class",
        "compl",
        "concept",
        "const",
        "consteval",
        "constexpr",
        "constinit",
        "const_cast",
        "continue",
        "co_await",
        "co_return",
        "co_yield",
        "decltype",
        "default",
        "delete",
        "do",
        "double",
        "dynamic_cast",
        "else",
        "enum",
        "explicit",
        "export",
        "extern",
        "false",
        "float",
        "for",
        "friend",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "mutable",
        "namespace",
        "new",
        "noexcept",
        "not",
        "not_eq",
        "nullptr",
        "operator",
        "or",
        "or_eq",
        "private",
        "protected",
        "public",
        "reflexpr",
        "register",
        "reinterpret_cast",
        "requires",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "static_assert",
        "static_cast",
        "struct",
        "switch",
        "synchronized",
        "template",
        "this",
        "thread_local",
        "throw",
        "true",
        "try",
        "typedef",
        "typeid",
        "typename",
        "union",
        "unsigned",
        "using",
        "virtual",
        "void",
        "volatile",
        "wchar_t",
        "while",
        "xor",
        "xor_eq",
      ],
      // 符号表（运算符、界符）
      singleSymbol: [";", "(", ")", "{", "}", "[", "]", ",", ".", "~"],
      doublenESymbol: ["=", "+", "-", "&", "|"],
      EqualSymbol: ["*", "/", "%", "!", "^"],
      idList: [],
      constList: [],
      constIntList: [],
      constFloatList: [],
      constCharList: [],
      constStringList: [],
    };
  },
  computed: {},
  methods: {
    // 获取源代码
    getSourceCode() {
      this.stat = 0;
      dialog
        .showOpenDialog({
          title: "请选择源代码文件",
          filters: [
            {
              name: "Source Files",
              extensions: ["c", "cpp"],
            },
            {
              name: "Header Files",
              extensions: ["h"],
            },
            {
              name: "All Files",
              extensions: ["*"],
            },
          ],
        })
        .then((result) => {
          if (result.filePaths[0].length == 0) return;
          this.filePath = result.filePaths[0];
          ipcRenderer.send("read-file", this.filePath);
        });
    },
    // 预处理
    preProcess() {
      this.idList.splice(0, this.idList.length);
      this.constList.splice(0, this.constList.length);
      this.constIntList.splice(0, this.constIntList.length);
      this.constFloatList.splice(0, this.constFloatList.length);
      this.constCharList.splice(0, this.constCharList.length);
      this.constStringList.splice(0, this.constStringList.length);
      let i,
        j,
        k,
        msg,
        itemList = [],
        lineList = this.sourceCode.split(/\r\n|\n/),
        includeFilePath = "",
        includeLines = [],
        defineList = [],
        inString = false,
        inAnnotation = false,
        annotationStartPos = 0;
      for (i = 0; i < lineList.length; i++) {
        // 去除前后空白符
        lineList[i] = lineList[i].trim();

        if (!inAnnotation && !inString) {
          // 处理#include
          if (lineList[i].slice(0, 8) == "#include") {
            let firstQuotPos = lineList[i].indexOf('"'),
              lastQuotPos = lineList[i].lastIndexOf('"');
            if (firstQuotPos != -1 && firstQuotPos != lastQuotPos) {
              includeFilePath = path.join(
                path.dirname(this.filePath),
                lineList[i].slice(firstQuotPos + 1, lastQuotPos)
              );
            } else {
              lineList.splice(i, 1);
              i--;
              this.$message({
                showClose: true,
                message: "Warning: 暂不支持除相对路径外的引用形式",
                type: "warning",
              });
              continue;
            }
            msg = ipcRenderer.sendSync("read-include-file", includeFilePath);
            if (msg.errFlag) {
              lineList.splice(i, 1);
              i--;
              this.$message({
                showClose: true,
                message: "Warning: 无法打开被引用文件，请检查相对路径的正确性",
                type: "warning",
              });
              continue;
            }
            includeLines = textDecoder.decode(msg.content).split("\r\n");
            lineList.splice(i, 1, ...includeLines);
            // console.log(lineList);
            i--;
            continue;
          }

          // 处理#define
          if (lineList[i].slice(0, 7) == "#define") {
            itemList = lineList[i].split(/\s/);
            if (itemList.length >= 3)
              defineList.push({ before: itemList[1], after: itemList[2] });
            lineList.splice(i, 1);
            i--;
            continue;
          }
        }

        for (j = 0; j < lineList[i].length; j++) {
          // 注释
          if (lineList[i][j] == "/") {
            // 行内注释
            if (j != lineList[i].length - 1 && lineList[i][j + 1] == "/")
              lineList[i] = lineList[i].slice(0, j);
            // 跨行注释
            else if (j != lineList[i].length - 1 && lineList[i][j + 1] == "*") {
              inAnnotation = true;
              annotationStartPos = j;
              j++;
            } else if (inAnnotation && j != 0 && lineList[i][j - 1] == "*") {
              inAnnotation = false;
              lineList[i] =
                lineList[i].slice(0, annotationStartPos) +
                lineList[i].slice(j + 1);
              j = annotationStartPos;
            }
          } else if (!inAnnotation && lineList[i][j] == '"') {
            inString = !inString;
          }
          // 空白符
          else if (!inString && !inAnnotation && /\s/.test(lineList[i][j])) {
            for (
              k = j + 1;
              k < lineList[i].length && /\s/.test(lineList[i][k]);
              k++
            );
            lineList[i] = lineList[i].slice(0, j) + " " + lineList[i].slice(k);
          }
          // 位于跨行注释中
          if (inAnnotation && j >= lineList[i].length - 1) {
            lineList[i] = lineList[i].slice(0, annotationStartPos);
            annotationStartPos = 0;
          }
        }
        // 去除前后空白符
        lineList[i] = lineList[i].trim();
        // 删除空行
        if (lineList[i].length == 0) {
          lineList.splice(i, 1);
          i--;
        } else {
          // 宏定义替换
          // for (j = 0; j < defineList.length; j++) {
          //   lineList[i] = lineList[i].replaceAll(
          //     defineList[j].before,
          //     defineList[j].after
          //   );
          // }
          // Better Version
          let p = lineList[i].length,
            tmpInString,
            lastIndex;
          for (j = 0; j < defineList.length; j++) {
            tmpInString = inString;
            lastIndex = lineList[i]
              .slice(0, p)
              .lastIndexOf(defineList[j].before);
            while (lastIndex != -1) {
              for (
                k = p - 1;
                k >= lastIndex + defineList[j].before.length;
                k--
              ) {
                if (lineList[i][k] == '"') {
                  tmpInString = !tmpInString;
                }
              }
              console.log("lastIndex: ", lastIndex);
              console.log("tmpInString: ", tmpInString);
              if (!tmpInString) {
                lineList[i] =
                  lineList[i].slice(0, lastIndex) +
                  defineList[j].after +
                  lineList[i].slice(lastIndex + defineList[j].before.length);
              }
              p = lastIndex;
              lastIndex = lineList[i]
                .slice(0, p)
                .lastIndexOf(defineList[j].before);
            }
          }
        }
      }
      this.preProcessResult = "";
      for (i = 0; i < lineList.length; i++) {
        this.preProcessResult += lineList[i] + "\r\n";
      }
      this.resultString = this.preProcessResult;
      this.stat = 1;
    },
    // 判断ch中的字符是否为字母
    IsLetter() {
      return /[a-zA-Z_]/.test(this.ch);
    },
    // 判断ch中的字符是否为数字
    IsDigit() {
      return /\d/.test(this.ch);
    },
    // 将下一字符读到ch中，搜索指示器前移一字符位置
    GetChar() {
      if (this.pointer >= this.preProcessResult.length) {
        this.finishFlag = true;
        this.ch = " ";
        return;
      }
      this.ch = this.preProcessResult[this.pointer];
      this.pointer++;
    },
    // 检查ch中的字符是否为空白。若是，则调用GetChar直至ch中进入一个非空白字符
    GetBC() {
      while ((!this.finishFlag && this.ch == " ") || this.ch == "\t") {
        this.GetChar();
      }
    },
    // 将ch中的字符连接到strToken之后
    Concat() {
      this.strToken += this.ch;
    },
    //
    Retract() {
      this.pointer--;
    },
    // 对strToken中的字符串查找保留字表，若它是一个保留字则返回它的编码，否则返回-1
    Reserve() {
      for (let i = 0; i < this.reserve.length; i++) {
        if (this.reserve[i] == this.strToken) return i;
      }
      return -1;
    },
    // 将strToken中的标识符插入符号表，返回符号表指针
    InsertId() {
      let i;
      for (i = 0; i < this.idList.length; i++) {
        if (this.idList[i].value == this.strToken) return i + 1;
      }
      this.idList.push({ index: i + 1, value: this.strToken });
      return i + 1;
    },
    // 将strToken中的常数插入常数表，返回常数表指针
    InsertConst(type) {
      let i, tempList;
      if (type == "Int") tempList = this.constIntList;
      else if (type == "Float") tempList = this.constFloatList;
      else if (type == "Char") tempList = this.constCharList;
      else if (type == "String") tempList = this.constStringList;
      else return;
      for (i = 0; i < tempList.length; i++) {
        if (tempList[i].value == this.strToken) return i + 1;
      }
      tempList.push({
        index: i + 1,
        value: this.strToken,
      });
      this.constList.push({
        index: i + 1,
        type: type,
        value: this.strToken,
      });
      return i + 1;
    },
    // 错误处理
    ProcError() {
      if (!this.errFlag) {
        this.lexicalAnalysisResult += "<此处出现词法错误>";
      }
      this.errFlag = true;
      // this.GetChar();
      if (this.pointer >= this.preProcessResult.length) {
        this.finishFlag = true;
      }
      return;
    },
    // 词法分析程序
    lexicalAnalysis(word) {
      let code, value;
      this.strToken = ""; // 置strToken为空串
      this.GetChar();
      this.GetBC();
      if (this.finishFlag) return 0;
      word.prop = "-";
      if (this.IsLetter()) {
        this.errFlag = false;
        while (!this.finishFlag && (this.IsLetter() || this.IsDigit())) {
          this.Concat();
          this.GetChar();
        }
        this.Retract();
        code = this.Reserve();
        if (code == -1) {
          value = this.InsertId(this.strToken);
          word.type = "ID";
          word.prop = value;
        } else {
          word.type = this.reserve[code];
        }
      } else if (this.IsDigit()) {
        this.errFlag = false;
        while (!this.finishFlag && this.IsDigit()) {
          this.Concat();
          this.GetChar();
        }
        if (this.ch == ".") {
          this.Concat();
          this.GetChar();
          if (this.IsDigit()) {
            while (!this.finishFlag && this.IsDigit()) {
              this.Concat();
              this.GetChar();
            }
            this.Retract();
            value = this.InsertConst("Float");
          } else {
            this.Retract();
            value = this.InsertConst("Float");
          }
          word.type = "Constant(Float)";
        } else {
          this.Retract();
          value = this.InsertConst("Int");
          word.type = "Constant(Int)";
        }
        word.prop = value;
      } else if (this.singleSymbol.indexOf(this.ch) != -1) {
        this.errFlag = false;
        word.type = this.ch;
      } else if (this.doublenESymbol.indexOf(this.ch) != -1) {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == "=" || this.ch == this.strToken[0]) {
          this.Concat();
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.EqualSymbol.indexOf(this.ch) != -1) {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == "=") {
          this.Concat();
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.ch == ">" || this.ch == "<") {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == "=") {
          this.Concat();
        } else if (this.ch == this.strToken[0]) {
          this.Concat();
          this.GetChar();
          if (this.ch == "=") {
            this.Concat();
          } else {
            this.Retract();
          }
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.ch == '"' || this.ch == "'") {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        while (!this.finishFlag && this.ch != this.strToken[0]) {
          this.Concat();
          this.GetChar();
        }
        this.Concat();
        if (this.strToken[0] == '"') {
          value = this.InsertConst("String");
          word.type = "Constant(String)";
        } else if (this.strToken[0] == "'") {
          value = this.InsertConst("Char");
          word.type = "Constant(Char)";
        }
        word.prop = value;
      } else if (this.ch == ":") {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == this.strToken[0]) {
          this.Concat();
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.ch == "\n" || this.ch == "\r") {
        this.errFlag = false;
        this.GetChar();
        while (!this.finishFlag && (this.ch == "\n" || this.ch == "\r")) {
          this.GetChar();
        }
        this.Retract();
        return 2;
      } else {
        this.ProcError();
      }
      if (this.finishFlag) {
        return 0;
      } else {
        return 1;
      }
    },
    // 词法分析顶层程序
    lexicalAnalysisTop() {
      this.lexicalAnalysisResult = "";
      this.finishFlag = false;
      this.pointer = 0;
      let temp,
        word = { type: "", prop: "" };
      while (!this.finishFlag) {
        temp = this.lexicalAnalysis(word);
        if (this.finishFlag) {
          break;
        } else if (temp == 1 && !this.errFlag) {
          this.lexicalAnalysisResult +=
            "<$" + word.type + ", " + word.prop + "> ";
        } else if (temp == 2) {
          this.lexicalAnalysisResult += "\n";
        }
      }
      this.resultString = this.lexicalAnalysisResult;
      this.stat = 0;
      console.log(this.constList);
    },
  },
  mounted() {
    ipcRenderer.on("file-content", (e, msg) => {
      if (msg.errFlag) {
        this.$message({
          showClose: true,
          message: msg.content,
          type: "error",
        });
      }
      this.sourceCode = textDecoder.decode(msg.content);
    });
  },
  watch: {
    sourceCode() {
      this.stat = 0;
    },
  },
};
</script>

<style>
#app {
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100%;
  width: 100%;
}
#reader {
  height: 100%;
  width: 50%;
  float: left;
}
#result {
  height: 100%;
  width: 50%;
  float: left;
}
.deselect {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
