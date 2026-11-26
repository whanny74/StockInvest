# 모의투자 기록지

이름을 고르고, 가상자금 1,000만 원으로 시작한 기록을 주차별로 남깁니다. 가족 공용 코드를 가진 사람은 등록된 모든 이름의 기록을 보고 수정할 수 있습니다.

<div data-portfolio>
  <noscript>웹 기록지를 열려면 브라우저에서 JavaScript를 켜 주세요.</noscript>
  <p class="pf-status" data-pf="status" role="status" aria-live="polite">기록지를 불러오는 중입니다.</p>
  <form class="pf-panel" data-pf="access" hidden>
    <h2>가족 기록 열기</h2>
    <div class="pf-row">
      <label class="pf-grow">가족 공용 코드
        <input name="code" type="password" required maxlength="128" autocomplete="off" spellcheck="false">
      </label>
      <button type="submit" class="pf-primary">기록 열기</button>
    </div>
    <label class="pf-checkbox pf-actions"><input name="remember" type="checkbox"> 이 기기에 코드 저장</label>
  </form>
  <section data-pf="workspace" aria-label="가족 모의투자 기록" hidden>
    <div class="pf-panel">
      <div class="pf-row">
        <label class="pf-grow">사람 선택 <select data-pf="people"></select></label>
        <button type="button" data-pf="refresh">새로고침</button>
        <button type="button" data-pf="lock">기록 닫기</button>
      </div>
      <form class="pf-row pf-actions" data-pf="add-person">
        <label class="pf-grow">추가할 이름 <input name="personName" required maxlength="40" autocomplete="off"></label>
        <button type="submit">사람 추가</button>
      </form>
    </div>
    <section data-pf="selected" class="pf-panel" hidden>
      <h2 data-pf="person-heading"></h2>
      <div class="pf-row">
        <button type="button" data-pf="new-record" class="pf-primary">기록 추가</button>
        <button type="button" data-pf="export">JSON 내려받기</button>
      </div>
      <form data-pf="editor" class="pf-actions" hidden>
        <h3 data-pf="editor-title" tabindex="-1"></h3>
        <div class="pf-grid">
          <label>기록 날짜 <input type="date" name="recordDate" required></label>
          <label>주차 <input type="number" name="week" min="1" max="8" inputmode="numeric" required></label>
          <label>남은 현금(원) <input type="number" name="cash" min="0" max="1000000000000" step="1" inputmode="numeric" required></label>
        </div>
        <div data-pf="assets" class="pf-actions"></div>
        <button type="button" data-pf="add-asset">보유 자산 추가</button>
        <p class="pf-actions">전체 평가액 <output class="pf-total" data-pf="total" aria-live="polite"></output></p>
        <label>판단과 근거 <textarea name="note" rows="4" maxlength="2000" placeholder="가격 기준 시점과 출처, 선택 이유, 위험, 다음 확인 질문"></textarea></label>
        <div class="pf-row pf-actions">
          <button type="submit" class="pf-primary">저장</button>
          <button type="button" data-pf="cancel">편집 취소</button>
        </div>
      </form>
      <p data-pf="empty" class="pf-actions" hidden>아직 저장된 기록이 없습니다.</p>
      <div data-pf="records" class="pf-actions"></div>
    </section>
  </section>
  <template data-pf="asset-template">
    <div class="pf-asset">
      <div class="pf-grid">
        <label>자산 이름 <input name="assetName" required maxlength="60"></label>
        <label>수량 <input name="quantity" type="number" min="1" max="1000000000000" inputmode="numeric" required></label>
        <label>평가 단가(원) <input name="price" type="number" min="0" max="1000000000000" inputmode="numeric" required></label>
      </div>
      <div class="pf-row pf-actions">
        <button type="button" data-remove-asset>자산 행 삭제</button>
      </div>
    </div>
  </template>
</div>

## 작성 예시

가격과 기업은 가상이며, 예시 계산에서는 수수료·세금·배당을 생략합니다.

| 자산 | 기준 단가 | 수량 | 배분 금액 | 선택 이유 |
| --- | ---: | ---: | ---: | --- |
| 가상 기업 A | 10,000원 | 300주 | 3,000,000원 | 아는 제품의 매출 비중을 확인해 보고 싶다. |
| 현금 | — | — | 7,000,000원 | 같은 업종의 다른 기업도 조사할 시간을 둔다. |
| 합계 | — | — | 10,000,000원 | |

- 근거: 주요 제품과 고객을 설명할 수 있다.
- 손실 가능성: 원재료 가격이 오르면 제품이 잘 팔려도 이익이 줄 수 있다.
- 확인할 질문: 최근 보고서에서 해당 제품의 매출 비중과 비용 추이를 확인할 수 있는가?
- 판단을 바꿀 조건: 조사한 제품이 전체 사업에서 차지하는 비중이 예상보다 작다면 기업을 고른 이유를 다시 검토한다.

## 주차별 갱신

배분을 바꾸기 전에 같은 기준 시점의 가격으로 기존 보유분을 평가합니다. 새 기록은 직전 기록의 자산과 현금을 가져옵니다. 평가 단가와 현금을 갱신하고, 어떤 새 사실 때문에 판단을 유지하거나 바꿨는지 메모합니다.

[1주차 퀴즈 해설](../quizzes/week01-answers.md) · [2주차 수익률 계산 활동지](worksheets.md#week02) · [6주차 자산배분 활동지](worksheets.md#week06)
