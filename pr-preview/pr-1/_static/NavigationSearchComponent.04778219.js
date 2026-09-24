!function(){function e(e,t,r,n){Object.defineProperty(e,t,{get:r,set:n,enumerable:!0,configurable:!0})}function t(e){return e&&e.__esModule?e.default:e}var r=("u">typeof globalThis?globalThis:"u">typeof self?self:"u">typeof window?window:"u">typeof global?global:{}).parcelRequire6955,n=r.register;n("19Grx",function(t,n){e(t.exports,"NavigationSearchWrapper",function(){return g});var o=r("btLMe"),s=r("j2z3x");r("6vwxN");var i=r("3wby9"),a=r("14Mzo"),l=r("4tDHr"),c=r("dWsOY"),u=r("dWCvw"),d=r("8ORPK"),p=r("5kpri"),h=r("dHVA2"),f=r("bnENU");let g=({placeholder:e,type:t})=>(0,o.jsx)(f.StrictMode,{children:(0,o.jsx)(c.EuiProvider,{colorMode:"light",globalStyles:!1,utilityClasses:!1,children:(0,o.jsx)(h.QueryClientProvider,{client:i.sharedQueryClient,children:(0,o.jsx)(b,{placeholder:e,type:t})})})}),b=({placeholder:e,type:t})=>{let{euiTheme:r}=(0,u.useEuiTheme)(),n="docs"===t||"api"===t?t:"all";return s.config.airGapped?null:(0,o.jsxs)("div",{className:"sticky top-0",css:(0,d.css)`
                padding-top: ${r.size.base};
                padding-right: ${r.size.base};
            `,children:[(0,o.jsx)(a.NavigationSearch,{placeholder:e??("api"===n?"Jump to API":void 0),typeFilter:n}),(0,o.jsx)(l.EuiHorizontalRule,{margin:"none",css:(0,d.css)`
                    margin-top: ${r.size.base};
                `})]})};customElements.define("navigation-search",(0,p.default)(g,{props:{placeholder:"string",type:"string"}}))}),n("14Mzo",function(t,n){e(t.exports,"NavigationSearch",function(){return T});var o=r("btLMe"),s=r("6vwxN"),i=r("6S2V9"),a=r("gRZP3"),l=r("4Bwd2"),c=r("3hz78"),u=r("N5q2n"),d=r("9NTcN"),p=r("5E13n"),h=r("6Zrbf"),f=r("epAoM"),g=r("7p5Ne"),b=r("gzADE"),v=r("dWCvw"),y=r("aUw5c"),m=r("8ORPK"),x=r("bnENU");let T=({placeholder:e="Jump to page",size:t="m",typeFilter:r="all"})=>{let{euiTheme:n}=(0,v.useEuiTheme)(),s=(0,y.useIsWithinMaxBreakpoint)("s"),[a,f]=(0,x.useState)(!1),b=(0,x.useRef)(null),T=(0,l.useSearchTerm)(),A=(0,l.useSelectedIndex)(),{setSearchTerm:S}=(0,l.useSearchActions)(),E=(0,u.useIsNavigationSearchCooldownActive)(),{isLoading:_,isFetching:N,data:I}=(0,p.useNavigationSearchQuery)(r),{trackOpened:w,trackClosed:C}=(0,h.useNavigationSearchTelemetry)(r),k=I?.results??[],j=!!T.trim(),O=_||N,P=()=>{C({reason:"navigate",query:T,hadResults:k.length>0,hadSelection:A>=0})},{inputRef:$,isKeyboardNavigating:z,handleInputKeyDown:M,handleMouseMove:H}=(0,d.useNavigationSearchKeyboardNavigation)({resultsCount:k.length,isLoading:O,onClose:()=>f(!1),onNavigate:P,typeFilter:r});return(0,c.useGlobalKeyboardShortcut)("k",()=>{w("keyboard_shortcut"),$.current?.focus(),$.current?.select()}),(0,x.useEffect)(()=>{let e=e=>{let t=e.detail?.elt;t?.hasAttribute("data-search-result-index")&&(f(!1),$.current?.blur())};return document.addEventListener("htmx:beforeSend",e),()=>{document.removeEventListener("htmx:beforeSend",e)}},[$]),(0,o.jsx)(g.EuiInputPopover,{isOpen:j,closePopover:()=>f(!1),ownFocus:!1,anchorPosition:"downLeft",disableFocusTrap:!0,panelMinWidth:s?void 0:640,panelPaddingSize:"none",offset:12,panelProps:{css:(0,m.css)`
                    border-radius: ${n.size.s};
                    visibility: ${a?"visible":"hidden"};
                    opacity: ${+!!a};
                    pointer-events: ${a?"auto":"none"};
                `,onMouseDown:e=>{e.preventDefault()}},input:(0,o.jsx)(o.Fragment,{children:(0,o.jsx)(i.SearchInput,{size:t,placeholder:e,inputRef:$,value:T,onChange:e=>{let t=e.target.value;S(t),f(!!t.trim())},onFocus:()=>{w("focus"),j&&f(!0)},onBlur:e=>{let t=e.relatedTarget;t&&b.current?.contains(t)||(a&&C({reason:"blur",query:T,hadResults:k.length>0,hadSelection:A>=0}),f(!1))},onKeyDown:e=>{if("Escape"===e.key){e.preventDefault(),C({reason:"escape",query:T,hadResults:k.length>0,hadSelection:A>=0}),S(""),f(!1);return}M(e)},disabled:E,isLoading:O})}),children:j&&(0,o.jsx)("div",{ref:b,children:(0,o.jsx)(R,{isKeyboardNavigating:z,onMouseMove:H,onResultClick:P,typeFilter:r})})})},A=[{keys:["returnKey"],label:"Jump to"},{keys:["sortUp","sortDown"],label:"Navigate"},{keys:["Esc"],label:"Close"}],S=[{keys:["returnKey"],label:"Jump to API"},{keys:["sortUp","sortDown"],label:"Navigate"},{keys:["Esc"],label:"Close"}],R=({isKeyboardNavigating:e,onMouseMove:t,onResultClick:r,typeFilter:n})=>(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(a.SearchResultsList,{isKeyboardNavigating:e,onMouseMove:t,onResultClick:r,typeFilter:n}),(0,o.jsx)(E,{typeFilter:n})]}),E=({typeFilter:e})=>{let{euiTheme:t}=(0,v.useEuiTheme)();return(0,y.useIsWithinMaxBreakpoint)("s")?null:(0,o.jsx)("div",{css:(0,m.css)`
                display: flex;
                align-items: center;
                justify-content: flex-end;
                min-height: 40px;
                box-sizing: content-box;
                border-top: 1px solid ${t.colors.borderBaseSubdued};
                background-color: ${t.colors.backgroundBasePlain};
                border-bottom-right-radius: ${t.size.s};
                border-bottom-left-radius: ${t.size.s};
                padding-inline: ${t.size.base};
                padding-block: ${t.size.xs};
                gap: ${t.size.base};
            `,children:("api"===e?S:A).map((e,t)=>(0,o.jsx)(I,{keys:e.keys,label:e.label},t))})},_=({children:e,className:t})=>{let{euiTheme:r}=(0,v.useEuiTheme)();return(0,o.jsx)("span",{className:t,css:(0,m.css)`
                display: inline-flex;
                justify-content: center;
                align-items: center;
                background-color: ${r.colors.backgroundBaseHighlighted};
                border: 1px solid ${r.colors.borderBasePlain};
                border-radius: ${r.border.radius.small};
                padding: 2px 8px;

                &.keyboard-key-icon {
                    padding-inline: 2px;
                }
            `,children:e})},N=({type:e})=>{let{euiTheme:t}=(0,v.useEuiTheme)(),r=s.availableIcons.includes(e);return(0,o.jsx)(_,{className:r?"keyboard-key-icon":"keyboard-key-text",children:r?(0,o.jsx)(f.EuiIcon,{type:e,size:"s",css:(0,m.css)`
                        color: ${t.colors.textSubdued};
                    `}):(0,o.jsx)("span",{className:"keyboard-key-text",css:(0,m.css)`
                        color: ${t.colors.textSubdued};
                        font-size: 11px;
                        line-height: 16px;
                        display: inline-block;
                        font-family: ${t.font.family};
                        font-weight: ${t.font.weight.regular};
                    `,children:e})})},I=({keys:e,label:t})=>{let{euiTheme:r}=(0,v.useEuiTheme)();return(0,o.jsxs)("span",{css:(0,m.css)`
                display: flex;
                align-items: center;
                gap: ${r.size.xs};
            `,children:[(0,o.jsx)("span",{css:(0,m.css)`
                    display: flex;
                    gap: ${r.size.xs};
                `,children:e.map((e,t)=>(0,o.jsx)(N,{type:e},e+t))}),(0,o.jsx)(b.EuiText,{size:"xs",css:(0,m.css)`
                    color: ${r.colors.textSubdued};
                `,children:t})]})}}),n("6S2V9",function(t,n){e(t.exports,"SearchInput",function(){return c});var o=r("btLMe"),s=r("7a7d4"),i=r("dWCvw"),a=r("8ORPK");let l=()=>{let{euiTheme:e}=(0,i.useEuiTheme)();return(0,o.jsx)("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg",css:(0,a.css)`
                color: ${e.colors.textDisabled};
                flex-shrink: 0;
            `,children:(0,o.jsx)("path",{d:"M7.87891 8.87891C9.05048 7.70735 10.9495 7.70735 12.1211 8.87891C13.172 9.93001 13.2802 11.5668 12.4453 12.7383L13.8535 14.1465L13.1465 14.8535L11.7383 13.4453C10.5668 14.2802 8.93001 14.172 7.87891 13.1211C6.70735 11.9495 6.70734 10.0505 7.87891 8.87891ZM5 13H2V12H5V13ZM11.4141 9.58594C10.633 8.80491 9.36698 8.80491 8.58594 9.58594C7.8049 10.367 7.8049 11.633 8.58594 12.4141C9.367 13.1949 10.6331 13.195 11.4141 12.4141C12.195 11.6331 12.1949 10.367 11.4141 9.58594ZM6 10H2V9H6V10ZM14 7H2V6H14V7ZM14 4H2V3H14V4Z",fill:"currentColor"})})},c=({placeholder:e,size:t,inputRef:r,value:n,onChange:c,onFocus:u,onBlur:d,onKeyDown:p,disabled:h,isLoading:f})=>{let{euiTheme:g}=(0,i.useEuiTheme)();return(0,o.jsxs)("div",{css:(0,a.css)`
                position: relative;
                display: flex;
                align-items: center;
            `,children:[(0,o.jsx)("span",{css:(0,a.css)`
                    position: absolute;
                    left: ${.75*g.base}px;
                    display: flex;
                    align-items: center;
                    pointer-events: none;
                `,children:f?(0,o.jsx)(s.EuiLoadingSpinner,{size:"m"}):(0,o.jsx)(l,{})}),(0,o.jsx)("input",{ref:r,type:"text",placeholder:e,value:n,onChange:c,onFocus:u,onBlur:d,onKeyDown:p,disabled:h,css:(0,a.css)`
                    width: 100%;
                    padding: calc(
                            ${"s"===t?g.size.xs:g.size.s} +
                                2px
                        )
                        ${"s"===t?g.size.s:g.size.m};
                    padding-left: 34px;
                    border: 1px solid ${g.colors.borderBasePlain};
                    border-radius: ${g.border.radius.medium};
                    background: ${g.colors.backgroundBaseSubdued};
                    font-size: ${g.font.scale.s*g.base}px;
                    line-height: ${1.25*g.base}px;
                    color: ${g.colors.textParagraph};
                    outline: none;

                    &::placeholder {
                        color: ${g.colors.textDisabled};
                    }

                    &:focus {
                        border-color: ${g.colors.primary};
                    }
                `})]})}}),n("gRZP3",function(t,n){e(t.exports,"SearchResultsList",function(){return m});var o=r("btLMe"),s=r("j2z3x"),i=r("dktEJ"),a=r("lkcpa"),l=r("4Bwd2"),c=r("5E13n"),u=r("6Zrbf"),d=r("2lWNF"),p=r("epAoM"),h=r("7a7d4"),f=r("4xvIe"),g=r("dWCvw"),b=r("aUw5c"),v=r("8ORPK"),y=r("bnENU");let m=({isKeyboardNavigating:e,onMouseMove:t,onResultClick:r,typeFilter:n="all"})=>{let{euiTheme:s}=(0,g.useEuiTheme)(),i=(0,l.useSelectedIndex)(),{setSelectedIndex:a}=(0,l.useSearchActions)(),{isLoading:d,data:p}=(0,c.useNavigationSearchQuery)(n),b=(0,y.useRef)(null),m=(0,l.useSearchTerm)(),{trackResultClicked:T}=(0,u.useNavigationSearchTelemetry)(n),A=p?.results??[],S=d&&!p;(0,y.useEffect)(()=>{b.current&&(b.current.scrollTop=0)},[m]);let R=(0,v.css)`
        max-height: ${465}px;
        overflow-y: auto;
        overflow-x: hidden;
        border-top-left-radius: ${s.size.s};
        border-top-right-radius: ${s.size.s};
        ${(0,f.useEuiOverflowScroll)("y",!1)}
    `,E=(0,v.css)`
        padding: ${s.size.xl} ${s.size.xl} ${s.size.l}
            ${s.size.xl};
        text-align: center;
        color: ${s.colors.textDisabled};
        font-size: ${s.font.scale.s*s.base}px;
        line-height: ${1.25*s.base}px;
    `;return S?(0,o.jsx)("div",{css:R,children:(0,o.jsx)("div",{css:E,children:(0,o.jsx)(h.EuiLoadingSpinner,{size:"xl"})})}):0===A.length?(0,o.jsx)("div",{css:R,children:(0,o.jsx)("div",{css:E,children:"api"===n?"We couldn't find an API that matches your search":"We couldn't find a page that matches your search"})}):(0,o.jsx)("div",{ref:b,css:R,children:A.map((s,l)=>(0,o.jsx)(x,{index:l,result:s,isSelected:l===i,isKeyboardNavigating:e.current,onMouseEnter:()=>{!e.current&&a(l)},onMouseMove:()=>{e.current&&(t(),a(l))},onClick:()=>{T({query:m,position:l,url:s.url,score:s.score}),r()},typeFilter:n},s.url))})},x=({index:e,result:t,isSelected:r,isKeyboardNavigating:n,onMouseEnter:a,onMouseMove:l,onClick:c,typeFilter:u})=>{let{euiTheme:d}=(0,g.useEuiTheme)(),p=(0,b.useIsWithinMaxBreakpoint)("s"),{ref:h,href:f}=(0,i.useHtmxLink)(t.url),m=(0,y.useMemo)(()=>{var e,r;return e=t.parents,r=s.config.buildType,"api"===u?["API",...e.slice(1).map(e=>(e=>{if(/ API$/i.test(e))return e;let t=e.split(/[-_]/).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ");return`${t} API`})(e.title))]:"codex"===r?e.map(e=>e.title):["Docs",...e.slice(1).map(e=>e.title)]},[t.parents,u]);return(0,o.jsxs)("a",{ref:h,href:f,"data-search-result-index":e,onClick:c,onMouseEnter:a,onMouseMove:l,"data-selected":r?"true":"false","data-keyboard-navigating":n?"true":"false",css:(0,v.css)`
                display: flex;
                align-items: center;
                gap: ${d.size.s};
                padding-inline: ${d.size.l};
                padding-block: ${d.size.base};
                text-decoration: none;
                cursor: pointer;
                border-bottom: 1px solid ${d.colors.borderBaseSubdued};
                background: ${r?d.colors.backgroundBaseSubdued:"transparent"};

                &:last-child {
                    border-bottom: none;
                }

                &:hover:not([data-keyboard-navigating='true']) {
                    background: ${r?d.colors.backgroundBaseSubdued:d.colors.backgroundBaseHighlighted};

                    .title-text {
                        color: ${d.colors.link};
                        text-decoration: underline;

                        mark {
                            color: ${d.colors.textParagraph};
                            text-decoration: underline;
                        }
                    }

                    .jump-to-indicator {
                        visibility: visible;
                    }
                }

                &[data-selected='true'] {
                    .title-text {
                        color: ${d.colors.link};
                        text-decoration: underline;

                        mark {
                            color: ${d.colors.textParagraph};
                            text-decoration: underline;
                        }
                    }

                    .jump-to-indicator {
                        visibility: visible;
                    }
                }
            `,children:[(0,o.jsxs)("div",{css:(0,v.css)`
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                `,children:[(0,o.jsx)(T,{items:m}),(0,o.jsx)(A,{text:t.title}),t.description&&(0,o.jsx)(S,{text:t.description})]}),!p&&(0,o.jsx)(R,{label:"api"===u?"Jump to API":"Jump to"})]})},T=({items:e})=>{let{euiTheme:t}=(0,g.useEuiTheme)();if(0===e.length)return null;let r=(0,v.css)`
        font-size: ${t.size.m};
        line-height: ${t.size.base};
        color: ${t.colors.textDisabled};
        margin-bottom: 0;
    `;if(1===e.length)return(0,o.jsx)("div",{css:r,children:e[0]});let n=e[0],s=e.slice(1,-1),i=e[e.length-1];return(0,o.jsxs)("div",{css:(0,v.css)`
                ${r}
                display: flex;
                white-space: nowrap;
                overflow: hidden;
            `,children:[(0,o.jsx)("span",{css:(0,v.css)`
                    flex-shrink: 0;
                `,children:n}),s.length>0&&(0,o.jsxs)("span",{css:(0,v.css)`
                        flex-shrink: 1;
                        min-width: 0;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        margin-left: 0.5ch;
                    `,children:[" / ",s.join(" / ")]}),(0,o.jsxs)("span",{css:(0,v.css)`
                    flex-shrink: 0;
                    margin-left: 0.5ch;
                `,children:[" / ",i]})]})},A=({text:e})=>{let{euiTheme:t}=(0,g.useEuiTheme)();return(0,o.jsx)("div",{className:"title-text",css:(0,v.css)`
                font-size: ${t.font.scale.s*t.base}px;
                line-height: ${t.size.l};
                font-weight: ${t.font.weight.bold};
                color: ${t.colors.textParagraph};
                margin-bottom: calc(${t.size.xs} / 2);

                mark {
                    background-color: ${t.colors.backgroundLightPrimary};
                    font-weight: ${t.font.weight.bold};
                    color: ${t.colors.textParagraph};
                }
            `,children:(0,o.jsx)(a.SanitizedHtmlContent,{htmlContent:e})})},S=({text:e})=>{let{euiTheme:t}=(0,g.useEuiTheme)();return(0,o.jsx)("div",{css:(0,v.css)`
                font-size: ${t.size.m};
                line-height: ${t.size.base};
                color: ${t.colors.textSubdued};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;

                mark {
                    background-color: ${t.colors.backgroundLightPrimary};
                    font-weight: ${t.font.weight.bold};
                }
            `,children:(0,o.jsx)(a.SanitizedHtmlContent,{htmlContent:e,ellipsis:!0})})},R=({label:e})=>{let{euiTheme:t}=(0,g.useEuiTheme)();return(0,o.jsx)("div",{className:"jump-to-indicator",css:(0,v.css)`
                flex-shrink: 0;
                color: ${t.colors.textSubdued};
                margin-left: ${t.size.xxxxl};
                visibility: hidden;
            `,children:(0,o.jsxs)(d.EuiBadge,{color:"hollow",children:[e," ",(0,o.jsx)(p.EuiIcon,{type:"returnKey",size:"s"})]})})}}),n("4Bwd2",function(t,n){e(t.exports,"useSearchTerm",function(){return s}),e(t.exports,"usePageNumber",function(){return i}),e(t.exports,"useSelectedIndex",function(){return a}),e(t.exports,"useSearchActions",function(){return l});let o=(0,r("4L9Hn").create)(e=>({searchTerm:"",page:0,selectedIndex:-1,actions:{setSearchTerm:t=>e({searchTerm:t,selectedIndex:0}),setPageNumber:t=>e({page:t}),setSelectedIndex:t=>e({selectedIndex:t}),clearSelection:()=>e({selectedIndex:-1}),clearSearchTerm:()=>e({searchTerm:"",selectedIndex:-1})}})),s=()=>o(e=>e.searchTerm),i=()=>o(e=>e.page),a=()=>o(e=>e.selectedIndex),l=()=>o(e=>e.actions)}),n("4L9Hn",function(t,n){"use strict";e(t.exports,"create",function(){return o},function(e){return o=e}),e(t.exports,"useStore",function(){return s},function(e){return s=e});var o,s,i=r("bnENU"),a=r("2PL3g");let l=e=>e;function c(e,t=l){let r=i.useSyncExternalStore(e.subscribe,i.useCallback(()=>t(e.getState()),[e,t]),i.useCallback(()=>t(e.getInitialState()),[e,t]));return i.useDebugValue(r),r}let u=e=>{let t=a.createStore(e),r=e=>c(t,e);return Object.assign(r,t),r};o=e=>e?u(e):u,s=c}),n("2PL3g",function(t,r){var n;e(t.exports,"createStore",function(){return n},function(e){return n=e});"use strict";let o=e=>{let t,r=new Set,n=(e,n)=>{let o="function"==typeof e?e(t):e;if(!Object.is(o,t)){let e=t;t=(null!=n?n:"object"!=typeof o||null===o)?o:Object.assign({},t,o),r.forEach(r=>r(t,e))}},o=()=>t,s={setState:n,getState:o,getInitialState:()=>i,subscribe:e=>(r.add(e),()=>r.delete(e))},i=t=e(n,o,s);return s};n=e=>e?o(e):o}),n("5E13n",function(t,n){e(t.exports,"useNavigationSearchQuery",function(){return T});var o=r("j2z3x"),s=r("84qB9"),i=r("bvPEA"),a=r("3jQaX"),l=r("6VAQM"),c=r("4Bwd2"),u=r("N5q2n"),d=r("pqPNq"),p=r("iK6On"),h=r("dHVA2"),f=r("cpSXU"),g=r("bnENU"),b=r("2Cuco");let v=b.object({url:b.string(),title:b.string()}),y=b.object({type:b.enum(["docs","api"]),url:b.string(),title:b.string(),description:b.string(),score:b.number(),parents:b.array(v)}),m=b.object({type:b.record(b.string(),b.number()).optional()}),x=b.object({results:b.array(y),totalResults:b.number(),pageCount:b.number(),pageNumber:b.number(),pageSize:b.number(),aggregations:m.optional()}),T=e=>{let t=(0,c.useSearchTerm)(),r=(0,c.usePageNumber)()+1,n=t.trim(),b=(0,f.useDebounce)(n,300),v=(0,u.useIsNavigationSearchCooldownActive)(),y=(0,u.useIsNavigationSearchAwaitingNewInput)(),{acknowledgeCooldownFinished:m}=(0,u.useNavigationSearchCooldownActions)(),T=(0,g.useRef)(b),A=(0,h.useQueryClient)();(0,g.useEffect)(()=>{T.current!==b&&y&&m(),T.current=b},[b,y,m]);let S=!!n&&n.length>=1&&!v&&!y,R=(0,p.useQuery)({queryKey:["navigation-search",{searchTerm:b.toLowerCase(),pageNumber:r,typeFilter:e}],queryFn:async({signal:t})=>!b||b.length<1?x.parse({results:[],totalResults:0}):(0,a.traceSpan)("navigation_search",async n=>{n.setAttribute(i.ATTR_NAVIGATION_SEARCH_QUERY,b),n.setAttribute("navigation_search.page",r);let a=new URLSearchParams({q:b,page:r.toString()});"all"!==e&&a.set("type",e);let c=await fetch(`${o.config.apiBasePath}/v1/navigation-search?`+a.toString(),{signal:t});if(!c.ok)throw await (0,l.createApiErrorFromResponse)(c);let u=await c.json(),d=x.parse(u);return n.setAttribute(i.ATTR_NAVIGATION_SEARCH_RESULTS_TOTAL,d.totalResults),n.setAttribute("navigation_search.results.count",d.results.length),n.setAttribute("navigation_search.page.count",d.pageCount),0===d.totalResults&&(0,s.logInfo)("navigation_search_zero_results",{[i.ATTR_NAVIGATION_SEARCH_QUERY]:b,[i.ATTR_NAVIGATION_SEARCH_QUERY_LENGTH]:b.length,[i.ATTR_NAVIGATION_SEARCH_RESULTS_TOTAL]:0}),d}),enabled:S,refetchOnWindowFocus:!1,refetchOnMount:!v,placeholderData:d.keepPreviousData,staleTime:3e5,retry:l.shouldRetry}),E=(0,g.useCallback)(()=>{A.cancelQueries({queryKey:["navigation-search",{searchTerm:b.toLowerCase(),pageNumber:r,typeFilter:e}]})},[A,b,r,e]);return(0,g.useEffect)(()=>{if(R.error&&(0,l.isApiError)(R.error))(0,l.isRateLimitError)(R.error)?(0,s.logWarn)("navigation_search_rate_limited",{[i.ATTR_NAVIGATION_SEARCH_QUERY]:b,[i.ATTR_NAVIGATION_SEARCH_RETRY_AFTER]:R.error.retryAfter??0}):(0,s.logWarn)("navigation_search_error",{[i.ATTR_NAVIGATION_SEARCH_QUERY]:b,[i.ATTR_ERROR_TYPE]:`${R.error.statusCode}`,"error.message":R.error.message});else if(R.error){let e=R.error;(0,s.logError)("navigation_search_parse_error",{[i.ATTR_NAVIGATION_SEARCH_QUERY]:b,[i.ATTR_ERROR_TYPE]:e.name,"error.message":e.message}),console.error("[navigation-search] failed to parse search response",e)}},[R.error,b]),{...R,cancelQuery:E}}}),n("6Zrbf",function(t,n){e(t.exports,"useNavigationSearchTelemetry",function(){return a});var o=r("84qB9"),s=r("bvPEA"),i=r("bnENU");let a=(e="all")=>{let t="api"===e?"api":void 0;return{trackOpened:(0,i.useCallback)(e=>{(0,o.logInfo)("navigation_search_opened",{[s.ATTR_NAVIGATION_SEARCH_TRIGGER]:e,...t?{[s.ATTR_NAVIGATION_SEARCH_SURFACE]:t}:{}})},[t]),trackClosed:(0,i.useCallback)(({reason:e,query:r,hadResults:n,hadSelection:i})=>{(0,o.logInfo)("navigation_search_closed",{[s.ATTR_NAVIGATION_SEARCH_CLOSE_REASON]:e,[s.ATTR_NAVIGATION_SEARCH_QUERY]:r,[s.ATTR_NAVIGATION_SEARCH_HAD_RESULTS]:n,[s.ATTR_NAVIGATION_SEARCH_HAD_SELECTION]:i,...t?{[s.ATTR_NAVIGATION_SEARCH_SURFACE]:t}:{}})},[t]),trackResultClicked:(0,i.useCallback)(({query:e,position:r,url:n,score:i})=>{(0,o.logInfo)("navigation_search_result_clicked",{[s.ATTR_NAVIGATION_SEARCH_QUERY]:e,[s.ATTR_NAVIGATION_SEARCH_RESULT_POSITION]:r,[s.ATTR_NAVIGATION_SEARCH_RESULT_URL]:n,[s.ATTR_NAVIGATION_SEARCH_RESULT_SCORE]:i,...t?{[s.ATTR_NAVIGATION_SEARCH_SURFACE]:t}:{}})},[t]),trackZeroResults:(0,i.useCallback)(e=>{(0,o.logInfo)("navigation_search_zero_results",{[s.ATTR_NAVIGATION_SEARCH_QUERY]:e,[s.ATTR_NAVIGATION_SEARCH_QUERY_LENGTH]:e.length,[s.ATTR_NAVIGATION_SEARCH_RESULTS_TOTAL]:0})},[]),trackNavigation:(0,i.useCallback)(({method:e,direction:t,query:r})=>{(0,o.logInfo)("navigation_search_navigation",{[s.ATTR_NAVIGATION_SEARCH_NAVIGATION_METHOD]:e,[s.ATTR_NAVIGATION_SEARCH_NAVIGATION_DIRECTION]:t,[s.ATTR_NAVIGATION_SEARCH_QUERY]:r})},[]),trackRateLimited:(0,i.useCallback)(({query:e,retryAfter:t})=>{(0,o.logWarn)("navigation_search_rate_limited",{[s.ATTR_NAVIGATION_SEARCH_QUERY]:e,[s.ATTR_NAVIGATION_SEARCH_RETRY_AFTER]:t})},[]),trackError:(0,i.useCallback)(({query:e,errorType:t,errorMessage:r})=>{(0,o.logWarn)("navigation_search_error",{[s.ATTR_NAVIGATION_SEARCH_QUERY]:e,[s.ATTR_ERROR_TYPE]:t,[s.ATTR_EXCEPTION_MESSAGE]:r})},[])}}}),n("3hz78",function(t,n){e(t.exports,"useGlobalKeyboardShortcut",function(){return s});var o=r("bnENU");let s=(e,t)=>{(0,o.useEffect)(()=>{let r=r=>{(r.metaKey||r.ctrlKey)&&r.key===e&&(r.preventDefault(),t())};return window.addEventListener("keydown",r),()=>window.removeEventListener("keydown",r)},[e,t])}}),n("9NTcN",function(t,n){e(t.exports,"useNavigationSearchKeyboardNavigation",function(){return a});var o=r("4Bwd2"),s=r("6Zrbf"),i=r("bnENU");let a=({resultsCount:e,isLoading:t,onClose:r,onNavigate:n,typeFilter:a})=>{let l=(0,i.useRef)(null),c=(0,i.useRef)(!1),u=(0,o.useSelectedIndex)(),d=(0,o.useSearchTerm)(),{setSelectedIndex:p}=(0,o.useSearchActions)(),{trackNavigation:h}=(0,s.useNavigationSearchTelemetry)(a),f=(0,i.useCallback)(()=>{c.current=!1},[]),g=e=>{let t=document.querySelector(`[data-search-result-index="${e}"]`);t?.scrollIntoView?.({block:"nearest"})},b=(0,i.useCallback)(o=>{switch(o.key){case"Escape":o.preventDefault(),r();break;case"Enter":var s;let i;if(o.preventDefault(),t||0===e)return;s=u>=0?u:0,(i=document.querySelector(`[data-search-result-index="${s}"]`))&&(n(),i.click());break;case"ArrowDown":if(o.preventDefault(),c.current=!0,e>0){let t=u<0?0:Math.min(u+1,e-1);p(t),g(t),h({method:"keyboard",direction:"down",query:d})}break;case"ArrowUp":if(o.preventDefault(),c.current=!0,e>0&&u>0){let e=u-1;p(e),g(e),h({method:"keyboard",direction:"up",query:d})}}},[e,t,u,d,p,r,n,h]);return{inputRef:l,isKeyboardNavigating:c,handleInputKeyDown:b,handleMouseMove:f}}}),n("7p5Ne",function(n,o){e(n.exports,"EuiInputPopoverWidthContext",function(){return E}),e(n.exports,"EuiInputPopover",function(){return _});var s=r("bnENU"),i=r("csXk9"),a=r("8ORPK"),l=r("ib2IS"),c=r("ms5WI"),u=r("kA5jP"),d=r("45sPE"),p=r("bpbST"),h=r("dWCvw"),f=r("atTQ0"),g=r("5So8r"),b=r("gy9uw"),v=r("j6x3p");function y(e){return(y="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}var m=["children","className","closePopover","anchorPosition","attachToAnchor","repositionToCrossAxis","display","panelPaddingSize","closeOnScroll","ownFocus","disableFocusTrap","focusTrapProps","input","fullWidth","panelMinWidth","onPanelResize","inputRef","panelRef","offset"];function x(){return(x=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)({}).hasOwnProperty.call(r,n)&&(e[n]=r[n])}return e}).apply(null,arguments)}function T(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function A(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?T(Object(r),!0).forEach(function(t){var n,o,s;n=e,o=t,s=r[t],(o=function(e){var t=function(e,t){if("object"!=y(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=y(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==y(t)?t:t+""}(o))in n?Object.defineProperty(n,o,{value:s,enumerable:!0,configurable:!0,writable:!0}):n[o]=s}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):T(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function S(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,s,i,a=[],l=!0,c=!1;try{if(s=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;l=!1}else for(;!(l=(n=s.call(r)).done)&&(a.push(n.value),a.length!==t);l=!0);}catch(e){c=!0,o=e}finally{try{if(!l&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(c)throw o}}return a}}(e,t)||function(e,t){if(e){if("string"==typeof e)return R(e,t);var r=({}).toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?R(e,t):void 0}}(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function R(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}var E=(0,s.createContext)(0),_=function(e){var r,n=e.children,o=e.className,i=e.closePopover,y=e.anchorPosition,T=e.attachToAnchor,R=e.repositionToCrossAxis,_=e.display,N=e.panelPaddingSize,I=e.closeOnScroll,w=void 0!==I&&I,C=e.ownFocus,k=void 0!==C&&C,j=e.disableFocusTrap,O=void 0!==j&&j,P=e.focusTrapProps,$=e.input,z=e.fullWidth,M=e.panelMinWidth,H=void 0===M?0:M,L=e.onPanelResize,V=e.inputRef,U=e.panelRef,F=e.offset,G=function(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r={};for(var n in e)if(({}).hasOwnProperty.call(e,n)){if(t.indexOf(n)>=0)continue;r[n]=e[n]}return r}(e,t);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(n=0;n<s.length;n++)r=s[n],t.indexOf(r)>=0||({}).propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}(e,m),D=t(l)("euiInputPopover",o),K=(0,h.useEuiTheme)(),W=(0,b.euiFormMaxWidth)(K),B=(0,s.useRef)(null),q=S((0,s.useState)(null),2),Q=q[0],Y=q[1],Z=S((0,s.useState)(null),2),J=Z[0],X=Z[1],ee=(0,p.useCombinedRefs)([Y,V]),et=(0,p.useCombinedRefs)([X,U]),er=(0,f.useResizeObserver)(Q,"width").width,en=(0,s.useMemo)(function(){return er<H?H:er},[H,er]);(0,s.useEffect)(function(){null==L||L(en)},[en,L]),(0,s.useEffect)(function(){J&&(J.style.inlineSize="".concat(en,"px"))},[J,en]),(0,s.useEffect)(function(){if(J){var e;null==(e=B.current)||e.positionPopoverFluid()}},[er,J]);var eo=null==(r=G.panelProps)?void 0:r.onKeyDown,es=(0,s.useCallback)(function(e){var t=(0,c.tabbable)(e.currentTarget).filter(function(e){return!e.hasAttribute("data-focus-guard")});if(t.length){var r=document.activeElement===t[0],n=document.activeElement===t[t.length-1];(r&&e.shiftKey||n&&!e.shiftKey)&&i()}},[i]),ei=(0,s.useCallback)(function(e){null==eo||eo(e),e.key===d.TAB&&(k||es(e))},[O,k,eo,es]);return(0,s.useEffect)(function(){if(w&&J){var e=function(e){var t=e.target;!J||!Q||!t||J.contains(t)||Q.contains(t)||t.contains(Q)&&i()},t=setTimeout(function(){window.addEventListener("scroll",e,{passive:!0,capture:!0})},500);return function(){window.removeEventListener("scroll",e,{capture:!0}),clearTimeout(t)}}},[w,i,J,Q]),(0,a.jsx)(v.EuiPopover,x({className:D,css:(0,a.css)(void 0!==z&&z?void 0:(0,u.logicalCSS)("max-width",W),";label:EuiInputPopover;"),display:void 0===_?"block":_,button:$,popoverRef:ee,panelRef:et,ref:B,closePopover:i,anchorPosition:void 0===y?"downLeft":y,attachToAnchor:void 0===T||T,offset:void 0===F?2:F,repositionToCrossAxis:void 0!==R&&R,panelPaddingSize:void 0===N?"s":N,ownFocus:k},G,{panelProps:A(A({},G.panelProps),{},{onKeyDown:ei})}),(0,a.jsx)(g.EuiFocusTrap,x({clickOutsideDisables:!0,disabled:O},P),(0,a.jsx)(E.Provider,{value:en},n)))};_.propTypes={className:t(i).string,"aria-label":t(i).string,"data-test-subj":t(i).string,css:t(i).any,anchorPosition:t(i).oneOf(["downLeft","downRight","downCenter"]),disableFocusTrap:t(i).bool,closeOnScroll:t(i).bool,fullWidth:t(i).bool,input:t(i).any.isRequired,inputRef:t(i).any,onPanelResize:t(i).func,panelMinWidth:t(i).number}})}();
//# sourceMappingURL=NavigationSearchComponent.04778219.js.map
