import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Component } from 'react';
import styles from '@patternfly/react-styles/css/components/ClipboardCopy/clipboard-copy.mjs';
import { css } from '@patternfly/react-styles';
class ClipboardCopyExpanded extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        const _a = this.props, { className, children, onChange, isReadOnly, isCode } = _a, props = __rest(_a, ["className", "children", "onChange", "isReadOnly", "isCode"]);
        return (_jsx("div", Object.assign({ suppressContentEditableWarning: true, className: css(styles.clipboardCopyExpandableContent, className), onInput: (e) => onChange(e, e.target.innerText), contentEditable: !isReadOnly }, props, { children: isCode ? _jsx("pre", { dir: "ltr", children: children }) : children })));
    }
}
ClipboardCopyExpanded.displayName = 'ClipboardCopyExpanded';
ClipboardCopyExpanded.defaultProps = {
    onChange: () => undefined,
    className: '',
    isReadOnly: false,
    isCode: false
};
export { ClipboardCopyExpanded };
//# sourceMappingURL=ClipboardCopyExpanded.js.map