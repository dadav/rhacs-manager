import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import styles from '@patternfly/react-styles/css/components/Truncate/truncate.mjs';
import { css } from '@patternfly/react-styles';
import { Tooltip } from '../Tooltip';
import { getReferenceElement } from '../../helpers';
import { getResizeObserver } from '../../helpers/resizeObserver';
export var TruncatePosition;
(function (TruncatePosition) {
    TruncatePosition["start"] = "start";
    TruncatePosition["end"] = "end";
    TruncatePosition["middle"] = "middle";
})(TruncatePosition || (TruncatePosition = {}));
const truncateStyles = {
    start: styles.truncateEnd,
    end: styles.truncateStart
};
const minWidthCharacters = 12;
const sliceTrailingContent = (str, slice) => [str.slice(0, str.length - slice), str.slice(-slice)];
const TruncateBase = (_a) => {
    var { className, href, position = 'end', tooltipPosition = 'top', tooltipProps, trailingNumChars = 7, maxCharsDisplayed, omissionContent = '\u2026', content, innerRef } = _a, props = __rest(_a, ["className", "href", "position", "tooltipPosition", "tooltipProps", "trailingNumChars", "maxCharsDisplayed", "omissionContent", "content", "innerRef"]);
    const [isTruncated, setIsTruncated] = useState(true);
    const [parentElement, setParentElement] = useState(null);
    const [textElement, setTextElement] = useState(null);
    const [shouldRenderByMaxChars, setShouldRenderByMaxChars] = useState(maxCharsDisplayed > 0);
    const textRef = useRef(null);
    useImperativeHandle(innerRef, () => textRef.current);
    const defaultSubParentRef = useRef(null);
    const subParentRef = (tooltipProps === null || tooltipProps === void 0 ? void 0 : tooltipProps.triggerRef) || defaultSubParentRef;
    const observer = useRef(null);
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
    useEffect(() => {
        if (textRef && textRef.current && !textElement) {
            setTextElement(textRef.current);
        }
    }, [textRef, textElement]);
    useEffect(() => {
        const refElement = getReferenceElement(subParentRef);
        if ((refElement === null || refElement === void 0 ? void 0 : refElement.parentElement) && !parentElement) {
            setParentElement(refElement.parentElement);
        }
    }, [subParentRef, parentElement]);
    useEffect(() => {
        if (textElement && parentElement && !observer.current && !shouldRenderByMaxChars) {
            const totalTextWidth = calculateTotalTextWidth(textElement, trailingNumChars, content);
            const textWidth = position === 'middle' ? totalTextWidth : textElement.scrollWidth;
            const handleResize = () => {
                const parentWidth = getActualWidth(parentElement);
                setIsTruncated(textWidth >= parentWidth);
            };
            const observer = getResizeObserver(parentElement, handleResize);
            return () => {
                observer();
            };
        }
    }, [textElement, parentElement, trailingNumChars, content, position, shouldRenderByMaxChars]);
    useEffect(() => {
        if (shouldRenderByMaxChars) {
            setIsTruncated(content.length > maxCharsDisplayed);
        }
    }, [shouldRenderByMaxChars]);
    useEffect(() => {
        setShouldRenderByMaxChars(maxCharsDisplayed > 0);
    }, [maxCharsDisplayed]);
    const lrmEntity = _jsx(Fragment, { children: "\u200E" });
    const isStartPosition = position === TruncatePosition.start;
    const isEndPosition = position === TruncatePosition.end;
    const renderResizeObserverContent = () => {
        if (isEndPosition || isStartPosition) {
            return (_jsx(_Fragment, { children: _jsxs("span", { ref: textRef, className: truncateStyles[position], children: [isStartPosition && lrmEntity, content, isStartPosition && lrmEntity] }) }));
        }
        const shouldSliceContent = content.length - trailingNumChars > minWidthCharacters;
        return (_jsx(_Fragment, { children: _jsxs(Fragment, { children: [_jsx("span", { ref: textRef, className: styles.truncateStart, children: shouldSliceContent ? sliceTrailingContent(content, trailingNumChars)[0] : content }), shouldSliceContent && (_jsx("span", { className: styles.truncateEnd, children: sliceTrailingContent(content, trailingNumChars)[1] }))] }) }));
    };
    const renderMaxDisplayContent = () => {
        const renderVisibleContent = (contentToRender) => (_jsx("span", { className: `${styles.truncate}__text`, children: contentToRender }));
        if (!isTruncated) {
            return renderVisibleContent(content);
        }
        const omissionElement = (_jsx("span", { className: `${styles.truncate}__omission`, "aria-hidden": "true", children: omissionContent }));
        const renderVisuallyHiddenContent = (contentToHide) => (_jsx("span", { className: "pf-v6-screen-reader", children: contentToHide }));
        if (position === TruncatePosition.start) {
            return (_jsxs(_Fragment, { children: [renderVisuallyHiddenContent(content.slice(0, maxCharsDisplayed * -1)), omissionElement, renderVisibleContent(content.slice(maxCharsDisplayed * -1))] }));
        }
        if (isEndPosition) {
            return (_jsxs(_Fragment, { children: [renderVisibleContent(content.slice(0, maxCharsDisplayed)), omissionElement, renderVisuallyHiddenContent(content.slice(maxCharsDisplayed))] }));
        }
        const trueMiddleStart = Math.floor(maxCharsDisplayed / 2);
        const trueMiddleEnd = Math.ceil(maxCharsDisplayed / 2) * -1;
        return (_jsxs(_Fragment, { children: [renderVisibleContent(content.slice(0, trueMiddleStart)), omissionElement, renderVisuallyHiddenContent(content.slice(trueMiddleStart, trueMiddleEnd)), renderVisibleContent(content.slice(trueMiddleEnd))] }));
    };
    const TruncateWrapper = href ? 'a' : 'span';
    const truncateBody = (_jsx(TruncateWrapper, Object.assign({ ref: !(tooltipProps === null || tooltipProps === void 0 ? void 0 : tooltipProps.triggerRef) ? subParentRef : null, href: href, className: css(styles.truncate, shouldRenderByMaxChars && styles.modifiers.fixed, className) }, (isTruncated && !href && !(tooltipProps === null || tooltipProps === void 0 ? void 0 : tooltipProps.triggerRef) && { tabIndex: 0 }), props, { children: !shouldRenderByMaxChars ? renderResizeObserverContent() : renderMaxDisplayContent() })));
    return (_jsxs(_Fragment, { children: [isTruncated && (_jsx(Tooltip, Object.assign({ hidden: !isTruncated, position: tooltipPosition, content: content, triggerRef: subParentRef }, tooltipProps))), truncateBody] }));
};
export const Truncate = forwardRef((props, ref) => (_jsx(TruncateBase, Object.assign({ innerRef: ref }, props))));
Truncate.displayName = 'Truncate';
//# sourceMappingURL=Truncate.js.map