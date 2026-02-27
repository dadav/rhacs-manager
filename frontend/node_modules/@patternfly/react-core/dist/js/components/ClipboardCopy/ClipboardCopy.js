"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardCopy = exports.ClipboardCopyVariant = exports.clipboardCopyFunc = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clipboard_copy_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ClipboardCopy/clipboard-copy"));
const react_styles_1 = require("@patternfly/react-styles");
const Tooltip_1 = require("../Tooltip");
const TextInput_1 = require("../TextInput");
const Truncate_1 = require("../Truncate");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const ClipboardCopyButton_1 = require("./ClipboardCopyButton");
const ClipboardCopyToggle_1 = require("./ClipboardCopyToggle");
const ClipboardCopyExpanded_1 = require("./ClipboardCopyExpanded");
const helpers_1 = require("../../helpers");
const clipboardCopyFunc = (_event, text) => {
    try {
        navigator.clipboard.writeText(text.toString());
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Clipboard API not found, this copy function will not work. This is likely because you're using an", "unsupported browser or you're not using HTTPS. \n\nIf you're a developer building an application which needs", "to support copying to the clipboard without the clipboard API, you'll have to create your own copy", 'function and pass it to the ClipboardCopy component as the onCopy prop. For more information see', 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/clipboard');
        // eslint-disable-next-line no-console
        console.error(error);
    }
};
exports.clipboardCopyFunc = clipboardCopyFunc;
var ClipboardCopyVariant;
(function (ClipboardCopyVariant) {
    ClipboardCopyVariant["inline"] = "inline";
    ClipboardCopyVariant["expansion"] = "expansion";
    ClipboardCopyVariant["inlineCompact"] = "inline-compact";
})(ClipboardCopyVariant || (exports.ClipboardCopyVariant = ClipboardCopyVariant = {}));
class ClipboardCopy extends react_1.Component {
    constructor(props) {
        super(props);
        this.timer = null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.componentDidUpdate = (prevProps, prevState) => {
            if (prevProps.children !== this.props.children) {
                const newText = Array.isArray(this.props.children)
                    ? this.props.children.join(' ')
                    : this.props.children;
                this.setState({ text: newText, textWhenExpanded: newText });
            }
        };
        this.componentWillUnmount = () => {
            if (this.timer) {
                window.clearTimeout(this.timer);
            }
        };
        this.expandContent = (_event) => {
            this.setState((prevState) => ({
                expanded: !prevState.expanded
            }));
        };
        this.updateText = (event, text) => {
            this.setState({ text });
            this.props.onChange(event, text);
        };
        this.updateTextWhenExpanded = (event, text) => {
            this.setState({ textWhenExpanded: text });
            this.props.onChange(event, text);
        };
        this.render = () => {
            const _a = this.props, { 
            /* eslint-disable @typescript-eslint/no-unused-vars */
            isExpanded, onChange, // Don't pass to <div>
            /* eslint-enable @typescript-eslint/no-unused-vars */
            isReadOnly, isCode, isBlock, exitDelay, maxWidth, entryDelay, onCopy, hoverTip, clickTip, textAriaLabel, toggleAriaLabel, variant, position, className, additionalActions, truncation, ouiaId, ouiaSafe, copyAriaLabel } = _a, divProps = tslib_1.__rest(_a, ["isExpanded", "onChange", "isReadOnly", "isCode", "isBlock", "exitDelay", "maxWidth", "entryDelay", "onCopy", "hoverTip", "clickTip", "textAriaLabel", "toggleAriaLabel", "variant", "position", "className", "additionalActions", "truncation", "ouiaId", "ouiaSafe", "copyAriaLabel"]);
            const textIdPrefix = 'text-input-';
            const toggleIdPrefix = 'toggle-';
            const contentIdPrefix = 'content-';
            const copyableText = this.state.text;
            const shouldTruncate = variant === ClipboardCopyVariant.inlineCompact && truncation;
            const inlineCompactContent = shouldTruncate ? ((0, jsx_runtime_1.jsx)(Truncate_1.Truncate, Object.assign({ tooltipProps: { triggerRef: this.clipboardRef }, content: copyableText }, (typeof truncation === 'object' && truncation)))) : (copyableText);
            return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopy, variant === ClipboardCopyVariant.inlineCompact && clipboard_copy_1.default.modifiers.inline, isBlock && clipboard_copy_1.default.modifiers.block, this.state.expanded && clipboard_copy_1.default.modifiers.expanded, shouldTruncate && clipboard_copy_1.default.modifiers.truncate, className), ref: this.clipboardRef }, (shouldTruncate && { tabIndex: 0 }), divProps, (0, helpers_1.getOUIAProps)(ClipboardCopy.displayName, ouiaId, ouiaSafe), { children: [variant === ClipboardCopyVariant.inlineCompact && ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { prefix: "", children: (id) => ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [!isCode && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyText), id: `${textIdPrefix}${id}`, children: inlineCompactContent })), isCode && ((0, jsx_runtime_1.jsx)("code", { className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyText, clipboard_copy_1.default.modifiers.code), id: `${textIdPrefix}${id}`, children: inlineCompactContent })), (0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyActions), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyActionsItem), children: (0, jsx_runtime_1.jsx)(ClipboardCopyButton_1.ClipboardCopyButton, { variant: "plain", exitDelay: exitDelay, entryDelay: entryDelay, maxWidth: maxWidth, position: position, id: `copy-button-${id}`, "aria-label": copyAriaLabel !== null && copyAriaLabel !== void 0 ? copyAriaLabel : hoverTip, onClick: (event) => {
                                                    onCopy(event, copyableText);
                                                    this.setState({ copied: true });
                                                }, onTooltipHidden: () => this.setState({ copied: false }), hasNoPadding: true, children: this.state.copied ? clickTip : hoverTip }) }), additionalActions && additionalActions] })] })) })), variant !== ClipboardCopyVariant.inlineCompact && ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { prefix: "", children: (id) => ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyGroup), children: [variant === ClipboardCopyVariant.expansion && ((0, jsx_runtime_1.jsx)(ClipboardCopyToggle_1.ClipboardCopyToggle, { isExpanded: this.state.expanded, onClick: (_event) => {
                                                this.expandContent(_event);
                                                if (this.state.expanded) {
                                                    this.setState({ text: this.state.textWhenExpanded });
                                                }
                                                else {
                                                    this.setState({ textWhenExpanded: copyableText });
                                                }
                                            }, id: `${toggleIdPrefix}${id}`, contentId: `${contentIdPrefix}${id}`, "aria-label": toggleAriaLabel })), (0, jsx_runtime_1.jsx)(TextInput_1.TextInput, Object.assign({ readOnlyVariant: isReadOnly || this.state.expanded ? 'default' : undefined, onChange: this.updateText, value: this.state.expanded ? this.state.textWhenExpanded : copyableText, id: `text-input-${id}`, "aria-label": textAriaLabel }, (isCode && { dir: 'ltr' }))), (0, jsx_runtime_1.jsx)(ClipboardCopyButton_1.ClipboardCopyButton, { exitDelay: exitDelay, entryDelay: entryDelay, maxWidth: maxWidth, position: position, id: `copy-button-${id}`, "aria-label": copyAriaLabel !== null && copyAriaLabel !== void 0 ? copyAriaLabel : hoverTip, onClick: (event) => {
                                                onCopy(event, this.state.expanded ? this.state.textWhenExpanded : copyableText);
                                                this.setState({ copied: true });
                                            }, onTooltipHidden: () => this.setState({ copied: false }), children: this.state.copied ? clickTip : hoverTip })] }), this.state.expanded && ((0, jsx_runtime_1.jsx)(ClipboardCopyExpanded_1.ClipboardCopyExpanded, { isReadOnly: isReadOnly, isCode: isCode, id: `content-${id}`, onChange: this.updateTextWhenExpanded, children: copyableText }))] })) }))] })));
        };
        const text = Array.isArray(this.props.children) ? this.props.children.join(' ') : this.props.children;
        this.state = {
            text,
            expanded: this.props.isExpanded,
            copied: false,
            textWhenExpanded: text
        };
        this.clipboardRef = (0, react_1.createRef)();
    }
}
exports.ClipboardCopy = ClipboardCopy;
ClipboardCopy.displayName = 'ClipboardCopy';
ClipboardCopy.defaultProps = {
    hoverTip: 'Copy to clipboard',
    clickTip: 'Successfully copied to clipboard!',
    isReadOnly: false,
    isExpanded: false,
    isCode: false,
    variant: 'inline',
    position: Tooltip_1.TooltipPosition.top,
    maxWidth: '150px',
    exitDelay: 1500,
    entryDelay: 300,
    onCopy: exports.clipboardCopyFunc,
    onChange: () => undefined,
    textAriaLabel: 'Copyable input',
    toggleAriaLabel: 'Show content',
    additionalActions: null,
    truncation: false,
    ouiaSafe: true
};
//# sourceMappingURL=ClipboardCopy.js.map