/**
 * YouTube 쇼츠 제작 AI 공통 타입 정의
 */

// 쇼츠 자막 및 타임라인 싱크 인터페이스
export interface ScriptLine {
  time: string; // "00:01"
  seconds: number; // 재생 초 (비교용)
  text: string; // 자막 텍스트
  audioStatus: string; // 오디오 멘트 효과
}

// 쇼츠 히스토리 아이템 인터페이스
export interface ShortsHistory {
  id: string;
  title: string;
  sourceType: 'text' | 'blog' | string;
  outputType: 'A' | 'B' | string;
  status: 'COMPLETED' | 'PROCESSING' | 'SCHEDULED' | 'FAILED' | string;
  views: number;
  likes: number;
  comments: number;
  scheduledAt: string;
  thumbnail: string;
}

// 비디오 톤앤매너 타입
export type VideoTone = 'humor' | 'review' | 'story' | 'information';

// 타겟 연령대 타입
export type TargetAge = 'all' | '2030' | '4050';

// 샘플 블로그 포스트 인터페이스
export interface BlogPostSample {
  url: string;
  title: string;
  content: string;
}

// 샘플 블로그 글 데이터 정의
export const SAMPLE_BLOG_POSTS: BlogPostSample[] = [
  {
    url: "https://blog.naver.com/charismagreat/223456789",
    title: "[공식 출시] 초경량 무선 청소기 '에어제트 X10' 솔직 사용 후기",
    content: "안녕하세요! 오늘은 드디어 고대하던 초경량 무선 청소기 에어제트 X10 언박싱 및 실사용 후기를 가져왔습니다. 무게가 무려 890g밖에 되지 않아 손목 부담이 전혀 없어요. 게다가 흡입력은 25000Pa로 미세먼지까지 완벽 흡입! 배터리 수명도 최대 50분이라 온 집안 청소에 끄떡없습니다. 브러시 헤드가 180도 회전해서 소파 밑 구석진 곳도 아주 부드럽게 잘 들어갑니다. 디자인도 감각적인 파스텔 톤이라 인테리어 오브제로도 손색없네요. 강력 추천합니다!"
  },
  {
    url: "https://blog.naver.com/charismagreat/223987654",
    title: "직장인 필수템, 스마트 온도조절 텀블러 '써모글로우' 3주 써본 소감",
    content: "커피가 식는 걸 제일 싫어하는 직장인 1인으로서 혁명적인 텀블러를 만났습니다. 바로 스마트 터치 디스플레이가 장착된 써모글로우 텀블러인데요. 손가락 터치 한 번으로 음료 온도를 45도에서 80도까지 1도 단위로 정밀 설정할 수 있습니다! 내부는 프리미엄 SUS316 의료용 스테인리스 재질이라 위생적이고 세척도 초간편. 한 번 충전으로 온종일 따뜻함을 유지해 줍니다. 이제 사무실에서 차갑게 식은 아메리카노 마실 일은 없을 것 같아요."
  }
];
