"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Truncate = exports.TruncatePosition = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const truncate_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Truncate/truncate"));
const react_styles_1 = require("@patternfly/react-styles");
const Tooltip_1 = require("../Tooltip");
const helpers_1 = require("../../helpers");
const resizeObserver_1 = require("../../helpers/resizeObserver");
var TruncatePosition;
(function (TruncatePosition) {
    TruncatePosition["start"] = "start";
    TruncatePosition["end"] = "end";
    TruncatePosition["middle"] = "middle";
})(TruncatePosition || (exports.TruncatePosition = TruncatePosition = {}));
const truncateStyles = {
    start: truncate_1.default.truncateEnd,
    end: truncate_1.default.truncateStart
};
const minWidthCharacters = 12;
const sliceTrailingContent = (str, slice) => [str.slice(0, str.length - slice), str.slice(-slice)];
const TruncateBase = (_a) => {
    var { className, href, position = 'end', tooltipPosition = 'top', tooltipProps, trailingNumChars = 7, maxCharsDisplayed, omissionContent = '\u2026', content, innerRef } = _a, props = tslib_1.__rest(_a, ["className", "href", "position", "tooltipPosition", "tooltipProps", "trailingNumChars", "maxCharsDisplayed", "omissionContent", "content", "innerRef"]);
    const [isTruncated, setIsTruncated] = (0, react_1.useState)(true);
    const [parentElement, setParentElement] = (0, react_1.useState)(null);
    const [textElement, setTextElement] = (0, react_1.useState)(null);
    const [shouldRenderByMaxChars, setShouldRenderByMaxChars] = (0, react_1.useState)(maxCharsDisplayed > 0);
    const textRef = (0, react_1.useRef)(null);
    (0, react_1.useImperativeHandle)(innerRef, () => textRef.current);
    const defaultSubParentRef = (0, react_1.useRef)(null);
    const subParentRef = (tooltipProps === null || tooltipProps === void 0 ? void 0 : tooltipProps.triggerRef) || defaultSubParentRef;
    const observer = (0, react_1.useRef)(null);
    if (maxCharsDisplayed <= 0) {
        // eslint-disable-next-line no-console
        console.warn('Truncate: the maxCharsDisplayed must be greater than 0, otherwise no content will be visible.');
    }
    const getActualWidth = (element) => {
        const computedStyle = getComputedStyle(element);
        return (parseFloat(computedStyle.width) -
            parseFloat(computedStyle.paddingLeft) -
            parseFloat(computedStyle.paddingRight) -
            parseFloat(computedStyle.borderRight) -
            parseFloat(computedStyle.borderLeft));
    };
    const calculateTotalTextWidth = (element, trailingNumChars, content) => {
        const firstTextWidth = element.scrollWidth;
        const firstTextLength = content.length;
        return (firstTextWidth / firstTextLength) * trailingNumChars + firstTextWidth;
    };
    (0, react_1.useEffect)(() => {
        if (textRef && textRef.current && !textElement) {
            setTextElement(textRef.current);
        }
    }, [textRef, textElement]);
    (0, react_1.useEffect)(() => {
        const refElement = (0, helpers_1.getReferenceElement)(subParentRef);
        if ((refElement === null || refElement === void 0 ? void 0 : refElement.parentElement) && !parentElement) {
            setParentElement(refElement.parentElement);
        }
    }, [subParentRef, parentElement]);
    (0, react_1.useEffect)(() => {
        if (textElement && parentElement && !observer.current && !shouldRenderByMaxChars) {
            const totalTextWidth = calculateTotalTextWidth(textElement, trailingNumChars, content);
            const textWidth = position === 'middle' ? totalTextWidth : textElement.scrollWidth;
            const handleResize = () => {
                const parentWidth = getActualWidth(parentElement);
                setIsTruncated(textWidth >= parentWidth);
            };
            const observer = (0, resizeObserver_1.getResizeObserver)(parentElement, handleResize);
            return () => {
                observer();
            };
        }
    }, [textElement, parentElement, trailingNumChars, content, position, shouldRenderByMaxChars]);
    (0, react_1.useEffect)(() => {
        if (shouldRenderByMaxChars) {
            setIsTruncated(content.length > maxCharsDisplayed);
        }
    }, [shouldRenderByMaxChars]);
    (0, react_1.useEffect)(() => {
        setShouldRenderByMaxChars(maxCharsDisplayed > 0);
    }, [maxCharsDisplayed]);
    const lrmEntity = (0, jsx_runtime_1.jsx)(react_1.Fragment, { children: "\u200E" });
    const isStartPosition = position === TruncatePosition.start;
    const isEndPosition = position === TruncatePosition.end;
    const renderResizeObserverContent = () => {
        if (isEndPosition || isStartPosition) {
            return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)("span", { ref: textRef, className: truncateStyles[position], children: [isStartPosition && lrmEntity, content, isStartPosition && lrmEntity] }) }));
        }
        const shouldSliceContent = content.length - trailingNumChars > minWidthCharacters;
        return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { ref: textRef, className: truncate_1.default.truncateStart, children: shouldSliceContent ? sliceTrailingContent(content, trailingNumChars)[0] : content }), shouldSliceContent && ((0, jsx_runtime_1.jsx)("span", { className: truncate_1.default.truncateEnd, children: sliceTrailingContent(content, trailingNumChars)[1] }))] }) }));
    };
    const renderMaxDisplayContent = () => {
        const renderVisibleContent = (contentToRender) => ((0, jsx_runtime_1.jsx)("span", { className: `${truncate_1.default.truncate}__text`, children: contentToRender }));
        if (!isTruncated) {
            return renderVisibleContent(content);
        }
        const omissionElement = ((0, jsx_runtime_1.jsx)("span", { className: `${truncate_1.default.truncate}__omission`, "aria-hidden": "true", children: omissionContent }));
        const renderVisuallyHiddenContent = (contentToHide) => ((0, jsx_runtime_1.jsx)("span", { className: "pf-v6-screen-reader", children: contentToHide }));
        if (position === TruncatePosition.start) {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderVisuallyHiddenContent(content.slice(0, maxCharsDisplayed * -1)), omissionElement, renderVisibleContent(content.slice(maxCharsDisplayed * -1))] }));
        }
        if (isEndPosition) {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderVisibleContent(content.slice(0, maxCharsDisplayed)), omissionElement, renderVisuallyHiddenContent(content.slice(maxCharsDisplayed))] }));
        }
        const trueMiddleStart = Math.floor(maxCharsDisplayed / 2);
        const trueMiddleEnd = Math.ceil(maxCharsDisplayed / 2) * -1;
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderVisibleContent(content.slice(0, trueMiddleStart)), omissionElement, renderVisuallyHiddenContent(content.slice(trueMiddleStart, trueMiddleEnd)), renderVisibleContent(content.slice(trueMiddleEnd))] }));
    };
    const TruncateWrapper = href ? 'a' : 'span';
    const truncateBody = ((0, jsx_runtime_1.jsx)(TruncateWrapper, Object.assign({ ref: !(tooltipProps === null || tooltipProps === void 0 ? void 0 : tooltipProps.triggerRef) ? subParentRef : null, href: href, className: (0, react_styles_1.css)(truncate_1.default.truncate, shouldRenderByMaxChars && truncate_1.default.modifiers.fixed, className) }, (isTruncated && !href && !(tooltipProps === null || tooltipProps === void 0 ? void 0 : tooltipProps.triggerRef) && { tabIndex: 0 }), props, { children: !shouldRenderByMaxChars ? renderResizeObserverContent() : renderMaxDisplayContent() })));
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [isTruncated && ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, Object.assign({ hidden: !isTruncated, position: tooltipPosition, content: content, triggerRef: subParentRef }, tooltipProps))), truncateBody] }));
};
exports.Truncate = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(TruncateBase, Object.assign({ innerRef: ref }, props))));
exports.Truncate.displayName = 'Truncate';
//# sourceMappingURL=Truncate.js.map