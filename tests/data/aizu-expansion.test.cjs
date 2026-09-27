const assert=require('node:assert/strict');
const test=require('node:test');
const data=require('../../data.json');
const {createDomain}=require('../../src/domain.js');
const {searchAll}=require('../../src/search.js');
const domain=createDomain(data), at=id=>domain.sceneById.get(id).index;

test('Nakano and Tanomo are background to the castle siege with one-scene coverage',()=>{
  for(const id of ['nakano-takeko','saigo-tanomo']){
    const p=domain.getPerson(id);
    assert.equal(domain.statusAt(p,at('1868-edo')),null);
    assert.equal(domain.statusAt(p,at('1868-tohoku')).evidence.reviewStatus,'verified');
    assert.equal(domain.statusAt(p,at('1869-hakodate')),null);
    const cast=data.incidents['aizu-siege'].participants.find(x=>x.personId===id);
    assert.equal(cast.involvement,'context');
    assert.ok(!data.relations.some(r=>r.a===id||r.b===id));
  }
  assert.match(domain.statusAt(domain.getPerson('nakano-takeko'),at('1868-tohoku')).stance,/城外の柳橋/);
  assert.ok(!domain.statusAt(domain.getPerson('nakano-takeko'),at('1868-tohoku')).role.includes('隊長'));
  const tanomo=domain.getPerson('saigo-tanomo');
  assert.equal(tanomo.evidence.reviewStatus,'needs_review');
  assert.equal(tanomo.born,'1830–没年確認中');
  assert.match(require('../../data/people.json').people.find(p=>p.id===tanomo.id).evidence.note,/1903.*1905/);
  assert.ok(tanomo.sources.includes('php_saigo_tanomo'));
  assert.ok(tanomo.sources.includes('ndl_authority_saigo_tanomo'));
  assert.equal(searchAll(data,'西郷近悳').find(x=>x.type==='人物').id,tanomo.id);
});
