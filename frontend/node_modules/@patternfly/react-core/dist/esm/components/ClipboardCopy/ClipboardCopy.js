import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, Fragment, createRef } from 'react';
import styles from '@patternfly/react-styles/css/components/ClipboardCopy/clipboard-copy.mjs';
import { css } from '@patternfly/react-styles';
import { TooltipPosition } from '../Tooltip';
import { TextInput } from '../TextInput';
import { Truncate } from '../Truncate';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
import { ClipboardCopyButton } from './ClipboardCopyButton';
import { ClipboardCopyToggle } from './ClipboardCopyToggle';
import { ClipboardCopyExpanded } from './ClipboardCopyExpanded';
import { getOUIAProps } from '../../helpers';
export const clipboardCopyFunc = (_event, text) => {
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
export var ClipboardCopyVariant;
(function (ClipboardCopyVariant) {
    ClipboardCopyVariant["inline"] = "inline";
    ClipboardCopyVariant["expansion"] = "expansion";
    ClipboardCopyVariant["inlineCompact"] = "inline-compact";
})(ClipboardCopyVariant || (ClipboardCopyVariant = {}));
class ClipboardCopy extends Component {
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
            isReadOnly, isCode, isBlock, exitDelay, maxWidth, entryDelay, onCopy, hoverTip, clickTip, textAriaLabel, toggleAriaLabel, variant, position, className, additionalActions, truncation, ouiaId, ouiaSafe, copyAriaLabel } = _a, divProps = __rest(_a, ["isExpanded", "onChange", "isReadOnly", "isCode", "isBlock", "exitDelay", "maxWidth", "entryDelay", "onCopy", "hoverTip", "clickTip", "textAriaLabel", "toggleAriaLabel", "variant", "position", "className", "additionalActions", "truncation", "ouiaId", "ouiaSafe", "copyAriaLabel"]);
            const textIdPrefix = 'text-input-';
            const toggleIdPrefix = 'toggle-';
            const contentIdPrefix = 'content-';
            const copyableText = this.state.text;
            const shouldTruncate = variant === ClipboardCopyVariant.inlineCompact && truncation;
            const inlineCompactContent = shouldTruncate ? (_jsx(Truncate, Object.assign({ tooltipProps: { triggerRef: this.clipboardRef }, content: copyableText }, (typeof truncation === 'object' && truncation)))) : (copyableText);
            return (_jsxs("div", Object.assign({ className: css(styles.clipboardCopy, variant === ClipboardCopyVariant.inlineCompact && styles.modifiers.inline, isBlock && styles.modifiers.block, this.state.expanded && styles.modifiers.expanded, shouldTruncate && styles.modifiers.truncate, className), ref: this.clipboardRef }, (shouldTruncate && { tabIndex: 0 }), divProps, getOUIAProps(ClipboardCopy.displayName, ouiaId, ouiaSafe), { children: [variant === ClipboardCopyVariant.inlineCompact && (_jsx(GenerateId, { prefix: "", children: (id) => (_jsxs(Fragment, { children: [!isCode && (_jsx("span", { className: css(styles.clipboardCopyText), id: `${textIdPrefix}${id}`, children: inlineCompactContent })), isCode && (_jsx("code", { className: css(styles.clipboardCopyText, styles.modifiers.code), id: `${textIdPrefix}${id}`, children: inlineCompactContent })), _jsxs("span", { className: css(styles.clipboardCopyActions), children: [_jsx("span", { className: css(styles.clipboardCopyActionsItem), children: _jsx(ClipboardCopyButton, { variant: "plain", exitDelay: exitDelay, entryDelay: entryDelay, maxWidth: maxWidth, position: position, id: `copy-button-${id}`, "aria-label": copyAriaLabel !== null && copyAriaLabel !== void 0 ? copyAriaLabel : hoverTip, onClick: (event) => {
                                                    onCopy(event, copyableText);
                                                    this.setState({ copied: true });
                                                }, onTooltipHidden: () => this.setState({ copied: false }), hasNoPadding: true, children: this.state.copied ? clickTip : hoverTip }) }), additionalActions && additionalActions] })] })) })), variant !== ClipboardCopyVariant.inlineCompact && (_jsx(GenerateId, { prefix: "", children: (id) => (_jsxs(Fragment, { children: [_jsxs("div", { className: css(styles.clipboardCopyGroup), children: [variant === ClipboardCopyVariant.expansion && (_jsx(ClipboardCopyToggle, { isExpanded: this.state.expanded, onClick: (_event) => {
                                                this.expandContent(_event);
                                                if (this.state.expanded) {
                                                    this.setState({ text: this.state.textWhenExpanded });
                                                }
                                                else {
                                                    this.setState({ textWhenExpanded: copyableText });
                                                }
                                            }, id: `${toggleIdPrefix}${id}`, contentId: `${contentIdPrefix}${id}`, "aria-label": toggleAriaLabel })), _jsx(TextInput, Object.assign({ readOnlyVariant: isReadOnly || this.state.expanded ? 'default' : undefined, onChange: this.updateText, value: this.state.expanded ? this.state.textWhenExpanded : copyableText, id: `text-input-${id}`, "aria-label": textAriaLabel }, (isCode && { dir: 'ltr' }))), _jsx(ClipboardCopyButton, { exitDelay: exitDelay, entryDelay: entryDelay, maxWidth: maxWidth, position: position, id: `copy-button-${id}`, "aria-label": copyAriaLabel !== null && copyAriaLabel !== void 0 ? copyAriaLabel : hoverTip, onClick: (event) => {
                                                onCopy(event, this.state.expanded ? this.state.textWhenExpanded : copyableText);
                                                this.setState({ copied: true });
                                            }, onTooltipHidden: () => this.setState({ copied: false }), children: this.state.copied ? clickTip : hoverTip })] }), this.state.expanded && (_jsx(ClipboardCopyExpanded, { isReadOnly: isReadOnly, isCode: isCode, id: `content-${id}`, onChange: this.updateTextWhenExpanded, children: copyableText }))] })) }))] })));
        };
        const text = Array.isArray(this.props.children) ? this.props.children.join(' ') : this.props.children;
        this.state = {
            text,
            expanded: this.props.isExpanded,
            copied: false,
            textWhenExpanded: text
        };
        this.clipboardRef = createRef();
    }
}
ClipboardCopy.displayName = 'ClipboardCopy';
ClipboardCopy.defaultProps = {
    hoverTip: 'Copy to clipboard',
    clickTip: 'Successfully copied to clipboard!',
    isReadOnly: false,
    isExpanded: false,
    isCode: false,
    variant: 'inline',
    position: TooltipPosition.top,
    maxWidth: '150px',
    exitDelay: 1500,
    entryDelay: 300,
    onCopy: clipboardCopyFunc,
    onChange: () => undefined,
    textAriaLabel: 'Copyable input',
    toggleAriaLabel: 'Show content',
    additionalActions: null,
    truncation: false,
    ouiaSafe: true
};
export { ClipboardCopy };
//# sourceMappingURL=ClipboardCopy.js.map