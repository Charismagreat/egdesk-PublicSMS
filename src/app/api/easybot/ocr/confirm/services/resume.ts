import { insertRows } from '../../../../../../../egdesk-helpers';

export async function handleResume(reqBody: any, nowStr: string) {
  const { data } = reqBody;
  if (!data || !data.name) {
    throw new Error('등록할 지원자의 성명(name)이 누락되었습니다.');
  }

  const generatedId = `APP-${Date.now()}`;
  const applicantRecord = {
    id: generatedId,
    name: data.name,
    age: data.age || '',
    phone: data.phone || '',
    experience: data.experience || '',
    motivation: data.motivation || '',
    matching_score: Number(data.matching_score) || 0,
    status: 'applied',
    signature_url: null,
    signed_at: null,
    resume_file_path: data.resume_file_path || '',
    tech_stacks: data.tech_stacks || '',
    interview_logs: JSON.stringify([]),
    ai_evaluation: null,
    created_at: nowStr
  };

  await insertRows('crm_recruitment_applicants', [applicantRecord]);

  return {
    action: 'inserted',
    name: data.name,
    applicant: {
      id: applicantRecord.id,
      name: applicantRecord.name,
      age: applicantRecord.age,
      phone: applicantRecord.phone,
      experience: applicantRecord.experience,
      motivation: applicantRecord.motivation,
      matchingScore: applicantRecord.matching_score,
      status: applicantRecord.status,
      interviewLogs: [],
      resume_file_path: applicantRecord.resume_file_path,
      tech_stacks: applicantRecord.tech_stacks
    },
    message: `이지봇 AI 비서가 지원자 [${data.name}] 님의 이력서 프로필을 채용 인재풀에 안전하게 적재 완료하였습니다! 🎯`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 지원자 [${data.name}] 님의 이력서 프로필을 채용 인재풀에 등록 대행하였습니다.`
  };
}
