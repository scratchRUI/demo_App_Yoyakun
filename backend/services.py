#AIの要約の依頼をする
def summarize_to_soap(raw_text: str) -> dict:
    #モック
    print("🤖AIに要約を依頼中...")

    soap_result = {
        "s_text": f"患者の訴え: {raw_text}",
        "o_text": "AIが抽出した客観的データが入ります",
        "a_text": "AIが抽出したアセスメントが入ります",
        "p_text": "AIが抽出した今後の計画が入ります"
    }

    return soap_result