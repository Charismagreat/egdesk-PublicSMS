const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/AiCopilotWidget.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. 탭 3 영역을 조건부 수동 제어 구조로 통째로 교체 (가장 먼저 실행하여 인덱스 뒤틀림 방지)
const tab3StartKeyword = `            {activeTab === "omni" && contentPack && (`;
const tab3EndKeyword = `      {/* 스마트폰 아침 브리핑 모의 시뮬레이터 (모달) */}`;

const startIndex = content.indexOf(tab3StartKeyword);
const endIndex = content.indexOf(tab3EndKeyword);

if (startIndex === -1 || endIndex === -1) {
  console.error("Error: Could not find target tab 3 markers!");
  process.exit(1);
}

// 탭 3의 새로운 내용 정의 (누락되었던 상위 래퍼 닫는 괄호들을 맨 하단에 안전히 복원)
const newTab3Content = `            {activeTab === "omni" && (
              <div className="space-y-4">
                {!contentPack ? (
                  <div className="bg-slate-100 border border-slate-200/60 rounded-2xl p-8 text-center space-y-4 shadow-sm animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
                      <Sparkles className="w-7 h-7 text-indigo-650 animate-pulse" />
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                      <h3 className="text-sm font-black text-slate-850">AI 옴니채널 마케팅 원고 패키지</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                        현재 활성화된 날씨(\${weather === "비" ? "비" : weather === "맑음" ? "맑음" : "흐림"}) 마케팅 전략과 매장 인기 시그니처 메뉴 분석 결과를 바탕으로,
                        네이버 블로그, 인스타그램 피드, 유튜브 쇼츠용 프리미엄 마케팅 원고를 실시간 맞춤 생성합니다.
                        <br />
                        <span className="text-indigo-650 font-extrabold text-[10px] block mt-1">(※ 작문 실행 시 약 3~4만 AI API 토큰이 소모됩니다.)</span>
                      </p>
                    </div>
                    
                    <button
                      onClick={handleGenerateOmniChannel}
                      disabled={isGeneratingOmni}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center mx-auto transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingOmni ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-1.5 animate-spin text-yellow-350" />
                          Gemini AI 카피라이터가 작문하는 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1.5 text-white animate-pulse" />
                          AI 옴니채널 광고 원고 생성하기
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 상단 생성 정보 & 다시 생성 단추 */}
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                      <span className="text-[10px] text-indigo-600 font-extrabold flex items-center font-bold">
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-550 animate-pulse" />
                        Gemini 3.5 Flash에 의해 최적의 맞춤 광고 원고 작문이 완료되었습니다.
                      </span>
                      <button
                        onClick={handleGenerateOmniChannel}
                        disabled={isGeneratingOmni}
                        className="text-[9px] font-black text-slate-555 hover:text-indigo-655 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg flex items-center transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={\`w-2.5 h-2.5 mr-1 \${isGeneratingOmni ? 'animate-spin' : ''}\`} />
                        원고 다시 생성
                      </button>
                    </div>

                    {/* 3채널 이너 탭 */}
                    <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl max-w-xs">
                      <button 
                        onClick={() => setOmniChannel("blog")}
                        className={\`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all \${omniChannel === "blog" ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:text-slate-800"}\`}
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        블로그
                      </button>
                      <button 
                        onClick={() => setOmniChannel("instagram")}
                        className={\`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all \${omniChannel === "instagram" ? "bg-pink-600 text-white shadow" : "text-slate-500 hover:text-slate-800"}\`}
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mr-1"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        인스타
                      </button>
                      <button 
                        onClick={() => setOmniChannel("shorts")}
                        className={\`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all \${omniChannel === "shorts" ? "bg-rose-600 text-white shadow" : "text-slate-500 hover:text-slate-800"}\`}
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1"><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                        쇼츠
                      </button>
                    </div>

                    {/* 채널 1: 네이버 블로그 */}
                    {omniChannel === "blog" && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3 shadow-sm">
                        <div>
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">AI Blog Creator</span>
                          <h4 className="text-xs font-extrabold text-slate-800 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                            {contentPack.blog.title}
                          </h4>
                        </div>
                        <div className="text-[11px] text-slate-655 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg max-h-48 overflow-y-auto border border-slate-200/45 shadow-inner font-semibold font-bold">
                          {contentPack.blog.body}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {contentPack.blog.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-semibold bg-emerald-55 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-[9px] text-slate-500 bg-slate-100 p-2 rounded-lg border border-slate-200/50 leading-normal font-bold">
                          <b>🖼️ 이미지 추천:</b> {contentPack.blog.imagePrompt}
                        </div>
                      </div>
                    )}

                    {/* 채널 2: 인스타그램 */}
                    {omniChannel === "instagram" && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3 shadow-sm">
                        <div>
                          <span className="text-[8px] font-black text-pink-600 uppercase tracking-widest block mb-1">AI Instagram Stylist</span>
                          <div className="text-[11px] text-slate-655 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg max-h-40 overflow-y-auto border border-slate-200/45 shadow-inner font-semibold">
                            {contentPack.instagram.caption}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {contentPack.instagram.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-semibold bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-[9px] text-slate-500 bg-slate-100 p-2 rounded-lg border border-slate-200/50 leading-normal font-bold">
                          <b>📸 연출 가이드:</b> {contentPack.instagram.visualDirection}
                        </div>
                      </div>
                    )}

                    {/* 채널 3: 유튜브 쇼츠 대본 */}
                    {omniChannel === "shorts" && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3 shadow-sm">
                        <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest block">AI Shorts Scriptwriter</span>
                        <div className="space-y-2">
                          {contentPack.shorts.sceneList.map((scene, idx) => (
                            <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-1.5">
                              <div className="text-[10px] font-black text-rose-600 flex items-center">
                                씬 {scene.sceneNum} ({scene.duration})
                              </div>
                              <div className="md:col-span-2 text-[10px] text-slate-655 font-semibold">
                                <b>🎬 화면:</b> {scene.visualDescription}
                              </div>
                              <div className="text-[10px] text-slate-800 italic font-extrabold bg-slate-100 p-2 rounded border border-slate-200/60 leading-normal">
                                🎙️ "{scene.voiceScript}"
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[9px] text-slate-500 bg-slate-100 p-2 rounded-lg border border-slate-200/50 leading-normal font-bold">
                          <b>🎵 BGM 추천:</b> {contentPack.shorts.audioTrack}
                        </div>
                      </div>
                    )}

                    {/* 마케팅 실행 버튼 구역 */}
                    <div className="border-t border-slate-200 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
                      <div className="text-[10px] text-slate-450 font-bold">
                        * 아래 승인 버튼을 누르시면 {strategy.targetIds.length}명의 고객에게 초개인화 문자가 발송되며, SNS 스케줄링이 기동됩니다.
                      </div>
                      
                      {!executedResult ? (
                        <button
                          onClick={handleLaunchCampaign}
                          disabled={isExecuting}
                          className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/10 flex items-center justify-center transition-all duration-300 disabled:opacity-50 min-w-[180px] text-xs"
                        >
                          {isExecuting ? (
                            <>
                              <Zap className="w-4 h-4 mr-1.5 animate-spin text-yellow-350" />
                              자율 마케팅 기동 중...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1.5 text-white" />
                              AI 성장 플랜 승인 및 가동
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-150 p-2.5 px-4 rounded-xl flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="text-[10.5px] text-emerald-700">
                            <span className="font-extrabold text-slate-800 block">🚀 캠페인 기동 완료!</span>
                            초개인화 문자 {executedResult.smsSent}건 발송 완료 및 옴니채널 SNS 자동 예약 포스팅 완료.
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </div>
`;

content = content.substring(0, startIndex) + newTab3Content + content.substring(endIndex);

// 2. 상태 변수 및 fetch 로직 replace (문자열 매칭)
const stateTarget = `  const handleWeatherChange = (newWeather: string) => {`;
const stateReplacement = `  const [isGeneratingOmni, setIsGeneratingOmni] = useState(false); // 수동 작문 모니터링 기동용 상태 변수

  const handleGenerateOmniChannel = async () => {
    setIsGeneratingOmni(true);
    try {
      const res = await fetch(\`/api/ai-briefing?weather=\${encodeURIComponent(weather)}&generateContent=true\`);
      const data = await res.json();
      if (data.success && data.contentPack) {
        setContentPack(data.contentPack);
      } else {
        alert("옴니채널 원고 생성 실패: " + (data.error || "알 수 없는 에러"));
      }
    } catch (e) {
      alert("원고 생성 통신 중 에러가 발생했습니다.");
    } finally {
      setIsGeneratingOmni(false);
    }
  };

  const handleWeatherChange = (newWeather: string) => {`;

const fetchTarget = `  const fetchBriefingData = async (selectedWeather: string) => {
    setLoading(true);`;
const fetchReplacement = `  const fetchBriefingData = async (selectedWeather: string) => {
    setLoading(true);
    setContentPack(null); // 날씨 변경/최초 로드 시 이전 원고를 안전하게 비움`;

content = content.replace(stateTarget, stateReplacement);
content = content.replace(fetchTarget, fetchReplacement);

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Successfully patched AiCopilotWidget.tsx!");
