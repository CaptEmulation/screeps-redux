@{%
const moo = require("moo");

const lexer = moo.compile({
  word: /[a-zA-Z]+/,
  or:  /\|/,
  and:  /&/,
  not:  /\!/,
  leftParens: /\(/,
  rightParens: /\)/
});
%}

@lexer lexer


main -> _ AO _ {% function(d) {return d[1]; } %}

# PEMDAS!
# We define each level of precedence as a nonterminal.

# Not
N -> "!" P    {% function(data) {
        return {
            operator: "not",
            expression:  data[1],
        };
    }%}
    | P {% id %}

# Parentheses
P -> %word "(" _ AO _ ")" {% function (data) {
        return {
          operator: "lambda",
          name: data[0].text,
          input: data[3]
        }
    }%}
    | "(" _ AO _ ")" {% function(data) {
        return {
          operator: "parens",
          expression: data[2]
        }
      }%}
    | W {% id %}




# and/or
AO -> AO _ "|" _ N {%
    function([left, , , , right]) {
        return {
            operator: "and",
            left,
            right
        };
    }
%}
    | AO _ "&" _ N {%
        function([left, , , , right]) {
            return {
                operator: "or",
                left,
                right
            };
        }
    %}
    | N            {% id %}

W -> %word {% function (data) {
  return {
    statement: data[0].text
  }
} %}

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_ -> [\s]:*     {% function(d) {return null; } %}
