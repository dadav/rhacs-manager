import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/CodeBlock/code-block.mjs';
import { css } from '@patternfly/react-styles';
export const CodeBlock = (_a) => {
    var { children = null, className, actions = null } = _a, props = __rest(_a, ["children", "className", "actions"]);
    return (_jsxs("div", Object.assign({ className: css(styles.codeBlock, className) }, props, { children: [actions && (_jsx("div", { className: css(styles.codeBlockHeader), children: _jsx("div", { className: css(styles.codeBlockActions), children: actions }) })), _jsx("div", { className: css(styles.codeBlockContent), children: children })] })));
};
CodeBlock.displayName = 'CodeBlock';
//# sourceMappingURL=CodeBlock.js.map