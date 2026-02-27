import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/CodeBlock/code-block.mjs';
import { css } from '@patternfly/react-styles';
export const CodeBlockCode = (_a) => {
    var { children = null, className, codeClassName } = _a, props = __rest(_a, ["children", "className", "codeClassName"]);
    return (_jsx("pre", Object.assign({ className: css(styles.codeBlockPre, className) }, props, { children: _jsx("code", { className: css(styles.codeBlockCode, codeClassName), children: children }) })));
};
CodeBlockCode.displayName = 'CodeBlockCode';
//# sourceMappingURL=CodeBlockCode.js.map