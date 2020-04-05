// Generated automatically by nearley, version 2.19.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require("moo");

const lexer = moo.compile({
  word: /[a-zA-Z]+/,
  or:  /\|/,
  and:  /&/,
  not:  /\!/,
  leftParens: /\(/,
  rightParens: /\)/
});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "main", "symbols": ["_", "AO", "_"], "postprocess": function(d) {return d[1]; }},
    {"name": "N", "symbols": [{"literal":"!"}, "P"], "postprocess":  function(data) {
            return {
                operator: "not",
                expression:  data[1],
            };
        }},
    {"name": "N", "symbols": ["P"], "postprocess": id},
    {"name": "P", "symbols": [(lexer.has("word") ? {type: "word"} : word), {"literal":"("}, "_", "AO", "_", {"literal":")"}], "postprocess":  function (data) {
            return {
              operator: "lambda",
              name: data[0].text,
              input: data[3]
            }
        }},
    {"name": "P", "symbols": [{"literal":"("}, "_", "AO", "_", {"literal":")"}], "postprocess":  function(data) {
          return {
            operator: "parens",
            expression: data[2]
          }
        }},
    {"name": "P", "symbols": ["W"], "postprocess": id},
    {"name": "AO", "symbols": ["AO", "_", {"literal":"|"}, "_", "N"], "postprocess": 
        function([left, , , , right]) {
            return {
                operator: "and",
                left,
                right
            };
        }
        },
    {"name": "AO", "symbols": ["AO", "_", {"literal":"&"}, "_", "N"], "postprocess": 
        function([left, , , , right]) {
            return {
                operator: "or",
                left,
                right
            };
        }
            },
    {"name": "AO", "symbols": ["N"], "postprocess": id},
    {"name": "W", "symbols": [(lexer.has("word") ? {type: "word"} : word)], "postprocess":  function (data) {
          return {
            statement: data[0].text
          }
        } },
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null; }}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
